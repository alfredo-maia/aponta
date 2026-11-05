#!/usr/bin/env python3
import re
import sys
from pathlib import Path

from tickets_scope import find_tickets_files, run_check

HEX_RE = re.compile(r'#[0-9A-Fa-f]{3,8}\b')
COLOR_CLASS_RE = re.compile(r'\b([a-z]+)-([0-9]+)\b')

# Famílias de cor que o DS redefine em apps/web/src/styles.css (@theme), com
# os graus que ele realmente define — qualquer outro grau nessas famílias é
# fora da escala do DS. ADR 0001: "brand-* e as paletas semânticas do DS são
# a única fonte de cor da aba" — regra geral, não uma lista fechada de nomes.
DS_FAMILY_DEGREES = {
    'brand': {'50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '1000'},
    'gray': {'70', '80', '90', '100', '200', '300', '400', '500', '600', '700', '800', '900', '1000'},
    'green': {'100', '200', '300', '400', '500', '600', '700', '800', '900', '1000'},
    'yellow': {'100', '200', '300', '400', '500', '600', '700', '800', '900', '1000'},
    'red': {'100', '200', '300', '400', '500', '600', '700', '800', '900', '1000'},
    'petroleum': {'70', '80', '90', '100', '200', '300', '400', '500', '600', '700', '800', '900', '1000'},
}

# Demais famílias da paleta padrão do Tailwind (não redefinidas pelo DS):
# qualquer grau é fora do DS. Lista fechada do VOCABULÁRIO do Tailwind, não
# uma lista fechada do que é proibido — tudo que não está em
# DS_FAMILY_DEGREES e aparece aqui é bloqueado, sem precisar nomear cada
# classe usada hoje no código (cobre teal/emerald/rose e também amber/blue
# e qualquer outra família que apareça depois).
OTHER_TAILWIND_COLOR_FAMILIES = {
    'slate', 'zinc', 'neutral', 'stone', 'orange', 'amber', 'lime', 'emerald',
    'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia',
    'pink', 'rose',
}


def find_violations(text: str) -> list[str]:
    violations = []
    for match in HEX_RE.finditer(text):
        violations.append(f'hex literal fora do DS: {match.group(0)}')
    for match in COLOR_CLASS_RE.finditer(text):
        family, degree = match.group(1), match.group(2)
        if family in DS_FAMILY_DEGREES:
            if degree not in DS_FAMILY_DEGREES[family]:
                violations.append(f'grau fora da escala do DS: {match.group(0)}')
        elif family in OTHER_TAILWIND_COLOR_FAMILIES:
            violations.append(f'classe de paleta fora do DS: {match.group(0)}')
    return violations


def main(argv: list[str]) -> int:
    root = Path(argv[1]) if len(argv) > 1 else Path.cwd()
    return run_check(
        root,
        find_violations,
        ok_message='OK: nenhum hex literal ou classe de paleta fora do DS na aba Tickets (AC-01, DMTE-427).',
        fail_message='FALHA: paleta fora do DS ou hex literal na aba Tickets (AC-01, DMTE-427).',
    )


if __name__ == '__main__':
    sys.exit(main(sys.argv))
