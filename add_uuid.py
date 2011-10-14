#!/usr/bin/python

## Add a uuid to the comments

import json
import uuid
import codecs
import sys

# -- coding: utf-8 --

def error_message(message, fatal=False):
  print  "\033[91m" + message + "\n \033[0m"
  if (fatal):
    exit(1)

def main():
  try:
    f = codecs.open("comments.json", encoding="utf-8", mode='r')
  except:
    error_message("cannot open comments.json", True)

  try:
    d = json.load(f)
  except Exception as e:
    error_message("comments.json "+ " : JSON parse error", True)
    print e
    return 1
  for i in d:
    i["uuid"] = str(uuid.uuid4())

  out = codecs.open("out.json", encoding="utf-8", mode='w')
  sys.stdout.write(json.JSONEncoder(ensure_ascii=False).encode(d))

sys.stdout = codecs.getwriter('utf8')(sys.stdout)
main()
