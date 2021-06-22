import os

from typing import Optional
from fastapi import FastAPI

import ddb_handler

app = FastAPI()

_ddb_table = os.environ.get('DDB_TABLE', 'no-table')
_ddb = ddb_handler.DDBHandler(_ddb_table)


@app.get("/")
def read_root():
    return {"Health": "Good"}


@app.get("/items")
def read_item():
    count = _ddb.get_items_count()
    print('[REQUEST] read_item', count)
    if count != None:
        return {'count': count}
    else:
        return {'error': 'fail to scan'}