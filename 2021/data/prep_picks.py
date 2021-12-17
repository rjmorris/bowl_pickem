# Update the names of the bowl games and teams in the raw picks file to match
# the ones in the games metadata file.

import csv

bowls = {}
teams = {}

with open('games.tsv', mode = 'rt', newline = '') as f:
    reader = csv.DictReader(f, delimiter = '\t')
    for row in reader:
        # Temporary fix for 2021 only.
        row['bowl_orig'] = row['bowl_orig'].strip()
        if row['underdog'] not in ('East Carolina'):
            row['underdog_orig'] = row['underdog_orig'].strip()
        if row['favorite'] not in ('Memphis'):
            row['favorite_orig'] = row['favorite_orig'].strip()

        bowls[row['bowl_orig']] = row['bowl']
        teams[row['favorite_orig']] = row['favorite']
        teams[row['underdog_orig']] = row['underdog']

picks = []
with open('picks_raw.csv', mode = 'rt', newline = '', encoding = 'latin') as f:
    reader = csv.DictReader(f)
    for row in reader:
        row['player'] = row['name']
        row['bowl'] = bowls[row['Bowl']]
        row['selection'] = teams[row['Selection']]
        row['confidence'] = row['Confidence_Score']
        picks.append(row)

with open('picks.tsv', mode = 'wt' , newline = '') as f:
    fieldnames = [
        'player',
        'bowl',
        'selection',
        'confidence'
    ]
    writer = csv.DictWriter(f, fieldnames = fieldnames, delimiter = '\t', extrasaction = 'ignore')
    writer.writeheader()
    writer.writerows(picks)
