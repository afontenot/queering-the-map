import json
from glob import glob

import msgpack

pagecount = 630

moments = []
maxpage = 0
messagecount = 0

for page in range(1, pagecount + 1):
    with open(f"moments.msgpack?page={page}", "rb") as f:
        b = f.read()
    msg = msgpack.unpackb(b)
    moments.extend(msg["moment_list"])
    messagecount += len(msg["moment_list"])
    maxpage = max(maxpage, msg["pages"])

with open("moments.json", "w") as of:
    of.write(json.dumps(moments))

print(f"read {pagecount} of {maxpage} pages")
print(f"processed {messagecount} messages")
