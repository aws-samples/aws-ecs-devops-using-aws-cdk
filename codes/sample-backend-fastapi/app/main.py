import os
import uuid
import time

from typing import Optional
from fastapi import FastAPI

import ddb_handler

import sys
import logging

_log_level = logging.INFO
logger = logging.getLogger()
logger.setLevel(_log_level)
log_handler = logging.StreamHandler(sys.stdout)
logger.addHandler(log_handler)

app = FastAPI()

_ddb_table = os.environ.get('DDB_TABLE', 'no-table')
_ddb = ddb_handler.DDBHandler(_ddb_table)


@app.get("/")
def read_root():
    logger.info('read_root')
    return {"Health": "Good"}


@app.get("/items")
def read_item():
    logger.info('read_item')

    count = _ddb.get_items_count()
    print('[REQUEST] read_item', count)
    if count != None:
        return {'count': count}
    else:
        return {'error': 'fail to scan'}


@app.get("/logging")
def log_item():
    logger.info('log_item')

    item = {
        'id': str(uuid.uuid4()),
        'time': time.strftime('%Y-%m-%d %I:%M:%S %p', time.localtime())
    }
    _ddb.put_item(item)