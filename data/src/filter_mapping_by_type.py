import sys
import json

if len(sys.argv) != 5:
    exit('Params: needed_types MRSTY snomed_mapping filtered_snomed_mapping')

needed_types_file = sys.argv[1]
MRSTY_file = sys.argv[2]
snomed_mapping_file = sys.argv[3]
filtered_snomed_mapping_file = sys.argv[4]

# semantic types
with open(needed_types_file) as f:
    types = json.load(f)
tui2cat = {}
for cat, codes in types.items():
    for code in codes:
        ss = code.strip().split('|')
        tui = ss[2]
        if tui not in tui2cat:
            tui2cat[tui] = cat
        else:
            print ('Ambiguous TUI:', tui)

print ('Number of TUIs needed:', len(tui2cat))

# load cui -> type file, only loading needed TUIs
cui2tui = {}
with open(MRSTY_file, encoding='utf8') as f:
    for line in f:
        ss = line.strip().split('|')
        cui = ss[0]
        tui = ss[1]
        if tui in tui2cat: # only taking the types we care about
            if cui not in cui2tui:
                cui2tui[cui] = set()
            cui2tui[cui].add(tui)

print('# of CUIs loaded:', len(cui2tui))

out_f = open(filtered_snomed_mapping_file, 'w', encoding='utf8')
with open(snomed_mapping_file, encoding='utf8') as f:
    ss = f.readline().strip().split('\t')
    out_f.write('\t'.join(ss + ['TUIs']) + '\n')
    for line in f:
        ss = line.strip().split('\t')
        CUI = ss[0]
        if CUI in cui2tui:
            tui_str = ','.join(cui2tui[CUI])
            out_f.write('\t'.join(ss + [tui_str]) + '\n')
out_f.close()
