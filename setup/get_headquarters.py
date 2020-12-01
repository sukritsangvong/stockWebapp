#!/usr/bin/env python3

import sys


def main():
    files = [sys.stdin]
    if len(sys.argv) > 1:
        files = [open(f) for f in sys.argv[1:]]
    headquarters_list = {}
    headquarters_col = 3
    for infile in files:
        for line in infile:
            if 'headquarters location' in line.lower():
                continue
            headquarters = line.strip().split('\t')[headquarters_col].strip()
            if headquarters not in headquarters_list:
                headquarters_list[headquarters] = len(headquarters_list)
    for headquarters in headquarters_list:
        try:    # need this in case, for example, `head` is used, which closes the pipe after a few lines
            print(f'{headquarters_list[headquarters]}\t{headquarters}')
        except BrokenPipeError:
            sys.exit(0)


if __name__ == '__main__':
    main()

