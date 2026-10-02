const fs = require('fs');
let code = fs.readFileSync('/home/hermes/repos/aponta/apps/web/src/components/tickets/TicketChecklist.tsx', 'utf8');
code = code.replace("import { Button } from '../ui/button';", "");
code = code.replace(/<Button size="sm" variant="outline" onClick=\{\(\) => createListMutation.mutate\('Pré-resolução'\)\}>\n\s*<Plus className="mr-2 h-4 w-4" \/> Criar Lista Interna\n\s*<\/Button>/g, 
  `<button type="button" className="inline-flex items-center rounded border px-3 py-1 text-sm bg-white hover:bg-gray-100" onClick={() => createListMutation.mutate('Pré-resolução')}><Plus className="mr-2 h-4 w-4" /> Criar Lista Interna</button>`
);
code = code.replace(/<Button\n\s*size="icon"\n\s*variant="ghost"\n\s*className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"\n\s*onClick=\{\(\) => deleteItemMutation.mutate\(\{ listId: checklist.id, itemId: item.id \}\)\}\n\s*>\n\s*<Trash2 className="h-3 w-3" \/>\n\s*<\/Button>/g,
  `<button type="button" className="inline-flex items-center justify-center rounded h-6 w-6 text-red-600 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteItemMutation.mutate({ listId: checklist.id, itemId: item.id })}><Trash2 className="h-3 w-3" /></button>`
);
code = code.replace(/<Button size="sm" type="submit" disabled=\{\!newItemText.trim\(\) \|\| addItemMutation.isPending\}>\n\s*<Plus className="h-4 w-4" \/>\n\s*<\/Button>/g,
  `<button type="submit" disabled={!newItemText.trim() || addItemMutation.isPending} className="inline-flex items-center justify-center rounded bg-primary text-white h-8 w-8 disabled:opacity-50"><Plus className="h-4 w-4" /></button>`
);
fs.writeFileSync('/home/hermes/repos/aponta/apps/web/src/components/tickets/TicketChecklist.tsx', code);
