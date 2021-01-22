import json
import datetime

from django.db.models import Q
from django.http import HttpResponseRedirect
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.contrib.auth.hashers import check_password, make_password
from django.shortcuts import render
from django.urls import reverse

from guardian.utils import get_anonymous_user

from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.serializers import ModelSerializer, ValidationError
from rest_framework.views import APIView

from catmaid.control.common import get_request_bool, get_request_list
from catmaid.control.authentication import (check_user_role, can_edit_or_fail,
                                           requires_user_role_for_any_project,
                                           PermissionError)
from catmaid.models import DeepLink, DeepLinkStack, DeepLinkStackGroup, UserRole


class DeepLinkStackerializer(ModelSerializer):

    class Meta:
        model = DeepLinkStack
        read_only_fields = ('id',)
        fields = ('id')


class DeepLinkSerializer(ModelSerializer):

    stacks = DeepLinkStackerializer(read_only=True, many=True) # many=True is required

    class Meta:
        model = DeepLink
        read_only_fields = ('id',)
        fields = (
            'id',
            'alias',
            'is_public',
            'location_x',
            'location_y',
            'location_z',
            'active_treenode',
            'active_connector',
            'active_skeleton',
            'layout',
            'tool',
            'show_help',
            'message',
            'data_view',
            'stacks',
        )


class SimpleDeepLinkSerializer(ModelSerializer):

    class Meta:
        model = DeepLink
        read_only_fields = ('id',)
        fields = '__all__'


class DeepLinkList(APIView):

    @method_decorator(requires_user_role_for_any_project([UserRole.Browse]))
    @never_cache
    def get(self, request:Request, project_id) -> Response:
        """List deep-links available to the client.
        ---
        serializer: SimpleDeepLinkSerializer
        """
        deep_links = DeepLink.objects.filter(
                Q(is_public=True) | Q(user_id=request.user.id), project_id=project_id)
        serializer = SimpleDeepLinkSerializer(deep_links, many=True)
        return Response(serializer.data)

    @method_decorator(requires_user_role_for_any_project([UserRole.Annotate]))
    def post(self, request:Request, project_id) -> Response:
        """Create a deep-link.

        The request user must not be anonymous and must have annotate
        permissions.
        ---
        serializer: DeepLinkSerializer
        """
        if request.user == get_anonymous_user() or not request.user.is_authenticated:
            raise PermissionError('Unauthenticated or anonymous users ' \
                                   'can not create persistent deep links.')

        project_id = int(project_id)

        alias = request.POST.get('alias')
        if not alias:
            n_links = DeepLink.objects.filter(project_id=project_id).count()
            alias = f'link-{n_links + 1}'

        params = {
            'project_id': project_id,
            'user': request.user,
            'alias': alias,
        }

        if 'is_public' in request.POST:
            params['is_public'] = get_request_bool(request.POST, 'is_public')

        if 'location_x' in request.POST:
            params['location_x'] = float(request.POST['location_x'])

        if 'location_y' in request.POST:
            params['location_y'] = float(request.POST['location_y'])

        if 'location_z' in request.POST:
            params['location_z'] = float(request.POST['location_z'])

        if 'active_treenode_id' in request.POST:
            params['active_treenode_id'] = int(request.POST['active_treenode_id'])

        if 'active_connector_id' in request.POST:
            params['active_connector_id'] = int(request.POST['active_connector_id'])

        if 'active_skeleton_id' in request.POST:
            params['active_skeleton_id'] = int(request.POST['active_skeleton_id'])

        if 'closest_node_to_location' in request.POST:
            params['closest_node_to_location'] = get_request_bool(request.POST, 'closest_node_to_location')

        if 'follow_id_history' in request.POST:
            params['follow_id_history'] = get_request_bool(request.POST, 'follow_id_history')

        if 'layered_stacks' in request.POST:
            params['layered_stacks'] = get_request_bool(request.POST, 'layered_stacks')

        if 'layout' in request.POST:
            params['layout'] = request.POST['layout']

        if 'tool' in request.POST:
            params['tool'] = request.POST['tool']

        if 'show_help' in request.POST:
            params['show_help'] = get_request_bool(request.POST, 'show_help')

        if 'password' in request.POST:
            params['password'] = make_password(request.POST('password'))

        if 'message' in request.POST:
            params['message'] = request.POST['message']

        # TBA: data_view

        deeplink = DeepLink(**params)
        deeplink.save()
        serializer = DeepLinkSerializer(deeplink)

        # Stacks
        if 'stacks' in request.POST:
            # Nested lists of 2-tuples: [[stack_id, scale_level]]
            stacks = get_request_list(request.POST, 'stacks', map_fn=float)
            for s in stacks:
                stack_link = DeepLinkStack(deep_link=deeplink, stack_id=s[0], zoom_level=s[1])
                stack_link.save()

        # Stack groups
        if 'stack_group' in request.POST:
            sg_id = int(request.POST['stack_group'])
            sg_zoom_levels = get_request_list(request.POST,
                'stack_group_scale_levels', map_fn=float)
            sg_link = DeepLinkStackGroup(deeplink=deeplink, stack_group_id=sg_id,
                    zoom_levels=sg_zoom_levels)
            sg_link.save()

        return Response(serializer.data)


class DeepLinkSelector(APIView):

    @method_decorator(requires_user_role_for_any_project([UserRole.Browse]))
    @never_cache
    def get(self, request:Request, project_id, alias) -> Response:
        """Get a deep-links available to the client.
        ---
        serializer: DeepLinkSerializer
        """
        params = [f'pid={project_id}', f'link={alias}']
        url = f'{reverse("catmaid:home")}?{"&".join(params)}'
        return HttpResponseRedirect(url)

    @method_decorator(requires_user_role_for_any_project([UserRole.Browse]))
    @never_cache
    def head(self, request:Request, project_id, alias) -> Response:
        """Get a deep-links available to the client.
        ---
        serializer: DeepLinkSerializer
        """
        try:
            deep_link = DeepLink.objects.get(project_id=project_id, alias=alias)
            if not deep_link.is_public and request.user != deep_link.user:
                raise PermissionError('Can not find or access link')
            return Response()
        except DeepLink.DoesNotExist:
            return Response('Link not found', status=status.HTTP_404_NOT_FOUND)

    @method_decorator(requires_user_role_for_any_project([UserRole.Annotate]))
    @never_cache
    def delete(self, request:Request, project_id, alias) -> Response:
        """Delete a deep-links available to the client.
        ---
        serializer: DeepLinkSerializer
        """
        try:
            deep_link = DeepLink.objects.get(project_id=project_id, alias=alias)
            can_edit_or_fail(request.user, deep_link.id, 'catmaid_deep_link')
            deep_link.delete()
            return Response({
                'deleted_id': deep_link.id
            })
        except DeepLink.DoesNotExist:
            return Response('Link not found', status=status.HTTP_404_NOT_FOUND)


class DeepLinkDetails(APIView):

    @method_decorator(requires_user_role_for_any_project([UserRole.Browse]))
    @never_cache
    def get(self, request:Request, project_id, alias) -> Response:
        """Get details on a deep-link.
        ---
        serializer: DeepLinkSerializer
        """
        try:
            deep_link = DeepLink.objects.get(project_id=project_id, alias=alias)
            if not deep_link.is_public and request.user != deep_link.user:
                raise PermissionError('Can not find or access link')
            serializer = DeepLinkSerializer(deep_link)
            return Response(serializer.data)
        except DeepLink.DoesNotExist:
            return Response('Link not found', status=status.HTTP_404_NOT_FOUND)