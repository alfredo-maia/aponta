const fs = require('fs');
let code = fs.readFileSync('/home/hermes/repos/aponta/apps/web/src/components/tickets/TicketForm.tsx', 'utf8');

code = code.replace(
  "import { useForm, useEffect } from 'react';",
  "import { useForm } from 'react-hook-form';\nimport { useEffect } from 'react';"
);

code = code.replace(
  "const {\n    register,\n    handleSubmit,\n    setValue,\n    formState:",
  "const {\n    register,\n    handleSubmit,\n    formState:"
);

fs.writeFileSync('/home/hermes/repos/aponta/apps/web/src/components/tickets/TicketForm.tsx', code);
