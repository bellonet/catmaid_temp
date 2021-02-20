from django.http import HttpRequest, HttpResponseRedirect, JsonResponse
from catmaid.control.authentication import requires_user_role
from catmaid.models import UserRole, PaintLabel
from typing import Any, Dict, Optional

@requires_user_role(UserRole.Annotate)
def get_paints(request:HttpRequest, project_id=None) -> JsonResponse:

    plabels = list(PaintLabel.objects.filter(project_id=project_id).order_by('label_id'))

    response:Dict[str, Any] = {'iTotalRecords': len(plabels), 'iTotalDisplayRecords': len(plabels), 'aaData': []}

    for l in plabels:
        response['aaData'] += [[
            l.label_id,
            l.to_delete,
            l.needs_edit,
            l.name,
            l.comment,
            l.location_z,
            l.location_y,
            l.location_x,
        ]]

    return JsonResponse(response)

@requires_user_role(UserRole.Annotate)
def update_paints(request:HttpRequest, project_id=None) -> JsonResponse:

    post = dict(request.POST)

    # Session user id:
    user_id = int(post["user"][0])

    table = {key: value for key, value in post.items() if key.startswith('paintTable')}

    ## html table has 8 columns
    n_rows_table = int(len(table) / 8)

    rows_in_table = { table[f'paintTable[{i}][label_id]'][0]: [table[f'paintTable[{i}][to_del]'][0], 
                                                            table[f'paintTable[{i}][to_edit]'][0], 
                                                            table[f'paintTable[{i}][name]'][0], 
                                                            table[f'paintTable[{i}][comment]'][0], 
                                                            table[f'paintTable[{i}][z]'][0], 
                                                            table[f'paintTable[{i}][y]'][0], 
                                                            table[f'paintTable[{i}][x]'][0]] for i in range(n_rows_table)}

    entries_in_db = PaintLabel.objects.filter(project_id=project_id)
    entries_in_db = { e.label_id: [e.to_delete, e.needs_edit, e.name, e.comment, e.location_z, e.location_y, e.location_x] for e in entries_in_db }

    # Iterate threw the rows of the html table and update the database if there are differences:
    for key,val in rows_in_table.items():
        if int(key) in entries_in_db:
            if val != entries_in_db[int(key)]:
                # update the database entry that has this label_id:
                p = PaintLabel.objects.get(label_id=int(key))
                p.to_delete = False if val[0]=='false' else True
                p.needs_edit = False if val[1]=='false' else True
                p.name = val[2]
                p.comment = val[3]
                p.location_z = int(float(val[4]))
                p.location_y = int(float(val[5]))
                p.location_x = int(float(val[6]))
                p.project_id = project_id
                p.user_id = user_id
                p.save()
        else:
            # Create new database entry:
            p = PaintLabel(
                label_id= int(key),
                to_delete= False if val[0]=='false' else True,
                needs_edit= False if val[1]=='false' else True,
                name= val[2],
                comment= val[3],
                location_z= int(float(val[4])),
                location_y= int(float(val[5])),
                location_x= int(float(val[6])),
                project_id = project_id,
                user_id = user_id
            )
            p.save()

    
    #status = {"status": b}
    status = 'ok'

    return JsonResponse({'status': status})
