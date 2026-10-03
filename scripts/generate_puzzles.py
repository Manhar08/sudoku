"""Generates original Sudoku puzzles with unique solutions (public domain output)."""
import random, json
random.seed(20261003)
def solve_count(g, limit=2):
    try: i = g.index(0)
    except ValueError: return 1
    r,c = divmod(i,9); used=set(g[r*9:r*9+9])|set(g[c::9])
    br,bc=r//3*3,c//3*3
    for rr in range(br,br+3): used|=set(g[rr*9+bc:rr*9+bc+3])
    n=0
    for v in range(1,10):
        if v not in used:
            g[i]=v; n+=solve_count(g,limit-n); g[i]=0
            if n>=limit: break
    return n
def full():
    g=[0]*81
    def fill(i):
        if i==81: return True
        r,c=divmod(i,9); br,bc=r//3*3,c//3*3
        used=set(g[r*9:r*9+9])|set(g[c::9])
        for rr in range(br,br+3): used|=set(g[rr*9+bc:rr*9+bc+3])
        vs=[v for v in range(1,10) if v not in used]; random.shuffle(vs)
        for v in vs:
            g[i]=v
            if fill(i+1): return True
        g[i]=0
        return False
    fill(0); return g
def make(target):
    sol=full(); p=sol[:]; cells=list(range(81)); random.shuffle(cells)
    clues=81
    for i in cells:
        if clues<=target: break
        b=p[i]; p[i]=0
        if solve_count(p[:])!=1: p[i]=b
        else: clues-=1
    return p,sol,clues
out=[]; seen=set()
for diff,(lo,hi) in [("easy",(38,42)),("medium",(30,33)),("hard",(23,27))]:
    n=0
    while n<40:
        p,s,cl=make(random.randint(lo,hi))
        if not(lo-2<=cl<=hi) : continue
        k=tuple(p)
        if k in seen: continue
        seen.add(k); n+=1
        out.append({"id":n,"difficulty":diff,"puzzle":"".join(map(str,p)),"solution":"".join(map(str,s))})
json.dump(out,open("src/data/puzzles.json","w"))
print(len(out))
