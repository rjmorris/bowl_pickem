# Update the names of the bowl games and teams in the raw picks file to match
# the ones in the games metadata file.

import csv

bowls = {}
teams = {}

with open('games.tsv', mode = 'rt', newline = '') as f:
    reader = csv.DictReader(f, delimiter = '\t')
    for row in reader:
        bowls[row['bowl_orig']] = row['bowl']
        teams[row['favorite_orig']] = row['favorite']
        teams[row['underdog_orig']] = row['underdog']

picks = []
with open('picks_raw.tsv', mode = 'rt', newline = '') as f:
    reader = csv.DictReader(f, delimiter = '\t')
    for row in reader:
        row['bowl'] = bowls[row['bowl']]
        row['favorite'] = teams[row['favorite']]
        row['underdog'] = teams[row['underdog']]
        row['selection'] = teams[row['selection']]
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
