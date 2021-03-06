from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import get_user_model
from django import forms
from django.core.exceptions import ValidationError
from django.conf import settings

User = get_user_model()


class RegisterForm(UserCreationForm):
    """An extended version of Django's user creation form. It also features
    first and last name as well as the email address.
    """
    first_name = forms.CharField(max_length=30)
    last_name = forms.CharField(max_length=30)
    email = forms.EmailField(max_length=75)
    terms_accepted = forms.BooleanField(label='Yes, I accept the terms and conditions below',
            required=settings.USER_REGISTRATION_CONFIRM_TERMS,
            widget=forms.CheckboxInput() if settings.USER_REGISTRATION_CONFIRM_TERMS else forms.HiddenInput())

    class Meta:
        model = User
        fields = ("username", "first_name", "last_name", "email",)

    def save(self, commit=True):
        user = super().save(commit=False)
        user.first_name = self.cleaned_data["first_name"]
        user.last_name = self.cleaned_data["last_name"]
        user.email = self.cleaned_data["email"]
        if commit:
            user.save()
        return user
