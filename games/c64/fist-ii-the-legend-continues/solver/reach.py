"""Which rooms the search model cannot reach with all eight scrolls, and the exits into them."""
import os
os.environ['FROM']='73:20:1,2,4,6,8:'
src=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'solve.py')).read().split('while len(dl)<8')[0]
exec(src)
dl={1,2,3,4,5,6,7,8}
seen={pos}; q=[pos]
while q:
    u=q.pop()
    for v,how in neighbours(u,dl):
        if v not in seen: seen.add(v); q.append(v)
R={r for r,s in seen}
print('unreached rooms',sorted(set(range(123))-R))
for r in sorted(set(range(123))-R):
    for e in ex[r]: pass
for r in range(123):
    for e in ex[r]:
        if e[2] in set(range(123))-R and r in R: print('into',e[2],'from',r,e, 'sections of',r,[s for rr,s in seen if rr==r], 'barriers',barriers(r,dl))
print(list(neighbours((79,1),dl)), area(79), exit_ok(79,dl), [inside(79,1,e[1],dl) for e in ex[79]], land(117,1,dl), seg(117,1,dl))
