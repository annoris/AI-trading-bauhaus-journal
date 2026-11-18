#!/usr/bin/env python3
"""Create an isolated, repeatable 20-trade preview through the public journal API."""
import argparse
import json
from datetime import date, datetime, timedelta
from urllib.request import Request, urlopen
from urllib.parse import quote

NAME = "Demo — 20 trades"

def seed(base):
    def api(path, body=None, method=None):
        request = Request(base.rstrip('/') + '/api/' + path,
                          data=json.dumps(body).encode() if body is not None else None,
                          headers={'Content-Type': 'application/json'}, method=method)
        with urlopen(request, timeout=30) as response:
            return json.load(response)

    existing = next((a for a in api('accounts')['accounts'] if a['name'] == NAME), None)
    account = existing['id'] if existing else api('accounts', {
        'name': NAME, 'kind': 'manual', 'broker': 'demo-20',
        'currency': 'USD', 'initialBalance': 25000, 'autoSync': False,
    })['id']
    strategies = {}
    books = api('playbooks')['playbooks']
    for name in ['Demo: breakout', 'Demo: pullback', 'Demo: reversal']:
        book = next((b for b in books if b['name'] == name), None)
        strategies[name] = book['id'] if book else api('playbooks', {
            'name': name, 'description': 'Fictional strategy for previewing the project.',
            'rules': ['Set the stop before entering', 'Wait for confirmation', 'Review the trade'],
        })['id']
    rows = api('trades?view=list&accounts=' + quote(account))['trades']
    if len(rows) > 20:
        raise RuntimeError('La cuenta contiene más de 20 operaciones; no se modifica.')
    days = []
    cursor = date(2026, 10, 9)
    while len(days) < 10:
        if cursor.weekday() < 5:
            days.append(cursor)
        cursor -= timedelta(days=1)
    days.reverse()
    symbols = [('AAPL', 220), ('NVDA', 130), ('TSLA', 240), ('AMD', 150), ('SPY', 550)]
    outcomes = [2, -1, 1.5, 0, 3, -1, 2, -.5, 1, -1, 2.5, 0, -1, 1.5, 2, -1, 1, 3, None, None]
    for i, result in enumerate(outcomes):
        symbol, price = symbols[i % len(symbols)]
        opened = f'{days[i // 2]}T{14 if i % 2 == 0 else 16}:00:00Z'
        short = i % 3 == 0
        quantity = 20 + (i % 4) * 10
        sign = -1 if short else 1
        fee = 0 if result == 0 else .5
        current = next((t for t in rows if t['symbol'] == symbol and t['openedAt'] == opened), None)
        if current is None:
            fills = [{'symbol': symbol, 'side': 'sell' if short else 'buy',
                      'quantity': quantity, 'price': price, 'fee': fee,
                      'executedAt': opened, 'assetClass': 'equity'}]
            if result is not None:
                exit_price = price + sign * result * 2
                closed = (datetime.fromisoformat(opened.replace('Z', '+00:00')) + timedelta(minutes=20 + i * 3)).isoformat()
                if i % 5 == 0 and result != 0:
                    for minute in [10, 25]:
                        fills.append({'symbol': symbol, 'side': 'buy' if short else 'sell',
                                      'quantity': quantity / 2, 'price': exit_price, 'fee': fee,
                                      'executedAt': (datetime.fromisoformat(opened.replace('Z', '+00:00')) + timedelta(minutes=minute)).isoformat(), 'assetClass': 'equity'})
                else:
                    fills.append({'symbol': symbol, 'side': 'buy' if short else 'sell',
                                  'quantity': quantity, 'price': exit_price, 'fee': fee,
                                  'executedAt': closed, 'assetClass': 'equity'})
            api('executions', {'accountId': account, 'executions': fills})
            current = next(t for t in api('trades?view=list&accounts=' + quote(account))['trades']
                           if t['symbol'] == symbol and t['openedAt'] == opened)
        api('trades/' + quote(current['key'], safe=''), {
            'stopLoss': price - sign * 2, 'profitTarget': price + sign * 6,
            'playbookId': list(strategies.values())[i % 3],
            'tags': ['Demo', 'Short' if short else 'Long', 'US session'],
            'mistakes': ['Early entry'] if result is not None and result < 0 else [],
            'rating': 2 if result is not None and result < 0 else 4,
            'reviewed': result is not None and i % 4 != 0,
            'notes': f'## Demo trade {i + 1}\nSynthetic data for previewing the journal.\n\nPlan: enter with a 2-point stop and a 6-point target. Review execution and discipline.',
        }, 'PATCH')
    final = api('trades?view=list&accounts=' + quote(account))
    assert len(final['trades']) == 20, 'Se esperaban exactamente 20 operaciones'
    assert sum(t['status'] == 'open' for t in final['trades']) == 2
    print(json.dumps({'accountId': account, 'trades': 20, 'metrics': final['metrics'],
                      'url': base + '/trades?accounts=' + quote(account)}, indent=2))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:3000')
    seed(parser.parse_args().url)
