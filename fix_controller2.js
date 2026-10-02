const fs = require('fs');
let code = fs.readFileSync('/home/hermes/repos/aponta/apps/api/src/tickets/tickets.controller.ts', 'utf8');

// remove the end of file append
code = code.replace(/\s*@Patch\(':id\/parent'\)[\s\S]*}$/, '\n}');

// Insert before the last `}`.
const replacement = `
  @Patch(':id/parent')
  @Roles(Role.AGENT, Role.AGENT_MASTER, Role.ADMIN)
  async updateParent(
    @Param('id') id: string,
    @Body() dto: UpdateParentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.updateParent(id, dto.parentProtocol, req.user);
  }
}
`;
code = code.replace(/}$/, replacement);
fs.writeFileSync('/home/hermes/repos/aponta/apps/api/src/tickets/tickets.controller.ts', code);
