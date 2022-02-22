import sys
from numpy import mean

if len(sys.argv) != 3:
    exit('Params: filtered_snomed_mapping snomed_str2code')

filtered_snomed_mapping_file = sys.argv[1]
snomed_str2code_file = sys.argv[2]

# first pass: cui -> pt
cui2pt = {}
with open(filtered_snomed_mapping_file, encoding='utf8') as f:
    f.readline() # skip header
    for line in f:
        ss = line.strip().split('\t')
        if len(ss) != 7:
            continue
        CUI, AUI, Source, TermType, SourceId, UMLSString, TUIs = ss
        if CUI not in cui2pt:
            cui2pt[CUI] = set()
        if TermType == 'PT':
            cui2pt[CUI].add(SourceId)
print ('number of CUIs', len(cui2pt))
print ('number of CUIs with at least one PT', sum([1 if len(v) > 0 else 0 for k, v in cui2pt.items()]))
print (mean([len(v) for k, v in cui2pt.items() if len(v) > 0]))

# second pass: string to codes
str2code = {}
with open(filtered_snomed_mapping_file, encoding='utf8') as f:
    f.readline() # skip header
    for line in f:
        ss = line.strip().split('\t')
        if len(ss) != 7:
            continue
        CUI, AUI, Source, TermType, SourceId, UMLSString, TUIs = ss
        if CUI in cui2pt:
            if len(cui2pt[CUI]) > 0:
                if UMLSString not in str2code:
                    str2code[UMLSString] = set()
                str2code[UMLSString].add( (CUI, TUIs, ','.join(cui2pt[CUI]) ) )

print ('number of strings', len(str2code))
print ('number of strings with at least one PT', sum([1 if len(v) > 0 else 0 for k, v in str2code.items()]) )
print (mean([len(v) for k, v in str2code.items() if len(v) > 0]))
# for k, v in str2code.items():
#     if len(v) > 1:
#         print (k, v)

with open(snomed_str2code_file, 'w', encoding='utf8') as f:
    for k, v in str2code.items():
        cuis = []
        for s in v:
            cuis.append(';'.join(s)) # CUI;TUIs;PTs
        f.write('{}\t{}\n'.format(k, '.'.join(cuis))) # between CUIs
