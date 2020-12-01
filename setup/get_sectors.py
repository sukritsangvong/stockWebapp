#!/usr/bin/env python3

import sys


def main():
    files = [sys.stdin]
    if len(sys.argv) > 1:
        files = [open(f) for f in sys.argv[1:]]
    sectors = {}
    sector_col = 2
    for infile in files:
        for line in infile:
            if 'gics sector' in line.lower():
                continue
            sector = line.strip().split('\t')[sector_col].strip()
            if sector not in sectors:
                sectors[sector] = len(sectors)
    for sector in sectors:
        try:    # need this in case, for example, `head` is used, which closes the pipe after a few lines
            print(f'{sectors[sector]}\t{sector}')
        except BrokenPipeError:
            sys.exit(0)


if __name__ == '__main__':
    main()
