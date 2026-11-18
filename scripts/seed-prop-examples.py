#!/usr/bin/env python3
"""Persist fictional prop accounts and payout examples without duplicating records."""
import json
from urllib.request import Request, urlopen
BASE = 'http://127.0.0.1:3000/api/prop-firms'
NOTE = 'FICTIONAL DEMO: synthetic data for presenting Trading Bauhaus. These are not real payments.'
def data():
    with urlopen(BASE) as r: return json.load(r)
def save(body):
    with urlopen(Request(BASE, data=json.dumps(body).encode(), headers={'Content-Type':'application/json'})) as r:
        return json.load(r)
def create(collection, body):
    if not any(r['id'] == body['id'] for r in data()[collection]): save(body)
for index, (firm, size, cost) in enumerate([
    ('Bauhaus Futures (Demo)',50000,149),
    ('Bauhaus Capital (Demo)',100000,299),
    ('Bauhaus Markets (Demo)',25000,99),
],1):
    account=f'example-prop-{index}'
    create('accounts',dict(action='account.save',id=account,revision=0,firm=firm,
        name=f'Funded account {size:,} USD — Demo',program='funded',status='active',
        currency='USD',size=str(size),openedOn='2026-08-01',notes=NOTE))
    create('entries',dict(action='entry.save',id=f'{account}-cost',revision=0,accountId=account,
        firm=firm,currency='USD',kind='expense',category='activation',amount=str(cost),occurredOn='2026-08-02',notes=NOTE))
    specs = [(f'{account}-paid','2026-09-05',1000*index,800*index,'2026-09-08'),
             (f'{account}-oct','2026-10-05',750*index,300 if index==2 else 0,'2026-10-08')]
    for payout, requested, amount, received, settled in specs:
        create('entries',dict(action='entry.save',id=payout,revision=0,accountId=account,firm=firm,
            currency='USD',kind='payout',amount=str(amount),splitPercent='80',fee='0',
            occurredOn=requested,dueOn='2026-10-15' if not received else settled,
            status='approved' if received or index==2 else 'requested',reference=payout.upper(),notes=NOTE))
        if received:
            row=next(e for e in data()['entries'] if e['id']==payout)
            create('receipts',dict(action='receipt.add',id=payout+'-receipt',revision=row['revision'],
                payoutId=payout,kind='receipt',amount=str(received),occurredOn=settled,reference='DEMO-RECEIPT',notes=NOTE))
            if received==amount*.8:
                row=next(e for e in data()['entries'] if e['id']==payout)
                if row['status']!='completed':
                    save(dict(action='entry.save',id=payout,revision=row['revision'],accountId=account,firm=firm,
                        currency='USD',kind='payout',amount=str(amount),splitPercent='80',fee='0',occurredOn=requested,
                        dueOn=settled,status='completed',reference=payout.upper(),notes=NOTE,reason='Demo of a fully received payout'))
final=data()
print(json.dumps({'accounts':len([a for a in final['accounts'] if a['id'].startswith('example-prop-')]),
    'payouts':len([e for e in final['entries'] if e['id'].startswith('example-prop-') and e['kind']=='payout']),
    'receivedUSD':sum(r['amountMinor'] for r in final['receipts'] if r['id'].startswith('example-prop-'))/100},indent=2))
