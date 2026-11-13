"""Le calculateur de subnetting (subnetting/subnet.js) est vérifié contre le module `ipaddress` de Python.

Le code JavaScript est lancé avec Node ; sans Node, les tests sont ignorés.
"""

import ipaddress
import json
import random
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
SUBNET_JS = ROOT / "subnetting" / "subnet.js"

pytestmark = pytest.mark.skipif(shutil.which("node") is None, reason="Node n'est pas installé")


def run_node(script, payload):
    """Exécute `script` dans Node avec `Subnet` chargé et `input` (le JSON envoyé) disponible."""
    program = (
        f"const Subnet = require({json.dumps(str(SUBNET_JS))});"
        "const input = JSON.parse(require('fs').readFileSync(0, 'utf8'));"
        f"{script}"
    )
    done = subprocess.run(
        ["node", "-e", program], input=json.dumps(payload), capture_output=True, text=True, timeout=60
    )
    assert done.returncode == 0, done.stderr
    return json.loads(done.stdout)


ANALYZE = """
const d = Subnet.toDotted;
console.log(JSON.stringify(input.map(([ip, prefix]) => {
  const a = Subnet.analyze(Subnet.parseDotted(ip), prefix);
  return {
    mask: d(a.mask), wildcard: d(a.wildcard), network: d(a.network), broadcast: d(a.broadcast),
    first: d(a.first), last: d(a.last), usable: a.usable, total: a.total, kind: a.kind,
    steps: Subnet.explain(a).map((s) => s.id),
  };
})));
"""


def expected(ip, prefix):
    """La même analyse, calculée par Python."""
    net = ipaddress.ip_network(f"{ip}/{prefix}", strict=False)
    address = ipaddress.ip_address(ip)
    if prefix == 32:
        usable, first, last, kind = 1, address, address, "host"
    elif prefix == 31:
        usable, first, last, kind = 2, net.network_address, net.broadcast_address, "host"
    else:
        usable = net.num_addresses - 2
        first, last = net.network_address + 1, net.broadcast_address - 1
        kind = (
            "network" if address == net.network_address else "broadcast" if address == net.broadcast_address else "host"
        )
    return {
        "mask": str(net.netmask), "wildcard": str(net.hostmask), "network": str(net.network_address),
        "broadcast": str(net.broadcast_address), "first": str(first), "last": str(last),
        "usable": usable, "total": net.num_addresses, "kind": kind,
    }  # fmt: skip


def sample_cases():
    rng = random.Random(224)
    cases = []
    for prefix in range(33):
        for _ in range(60):
            ip = ipaddress.ip_address(rng.randrange(2**32))
            network = ipaddress.ip_network(f"{ip}/{prefix}", strict=False)
            # On tire aussi les adresses limites : c'est là que les erreurs se cachent.
            cases.append((str(ip), prefix))
            cases.append((str(network.network_address), prefix))
            cases.append((str(network.broadcast_address), prefix))
    cases += [("0.0.0.0", 0), ("255.255.255.255", 32), ("255.255.255.255", 0), ("0.0.0.0", 32)]
    return cases


def test_every_prefix_matches_python_ipaddress():
    cases = sample_cases()
    results = run_node(ANALYZE, cases)
    assert len(results) == len(cases)
    for (ip, prefix), got in zip(cases, results):
        want = expected(ip, prefix)
        assert {key: got[key] for key in want} == want, f"{ip}/{prefix}"


def test_the_video_example():
    (got,) = run_node(ANALYZE, [("172.20.95.191", 19)])
    assert got["mask"] == "255.255.224.0"
    assert got["network"] == "172.20.64.0"
    assert got["broadcast"] == "172.20.95.255"
    assert (got["first"], got["last"]) == ("172.20.64.1", "172.20.95.254")
    assert (got["usable"], got["total"]) == (8190, 8192)
    assert got["kind"] == "host"
    assert got["steps"] == ["masque", "saut", "reseaux", "broadcast", "verdict", "plage"]


def test_the_board_lists_networks_by_jumps_of_32():
    board = run_node(
        "const a = Subnet.analyze(Subnet.parseDotted(input[0]), input[1]);"
        "console.log(JSON.stringify(Subnet.explain(a).find((s) => s.id === 'reseaux').board));",
        ["172.20.95.191", 19],
    )
    assert [line["text"] for line in board] == [
        "172.20.0.0", "172.20.32.0", "172.20.64.0 (RÉSEAU)", "172.20.96.0",
    ]  # fmt: skip
    assert [line["tone"] for line in board] == ["ink", "ink", "red", "ink"]


@pytest.mark.parametrize(
    ("text", "ip", "prefix"),
    [
        ("172.20.95.191/19", "172.20.95.191", 19),
        ("  172.20.95.191 / 19 ", "172.20.95.191", 19),
        ("172.20.95.191 255.255.224.0", "172.20.95.191", 19),
        ("172.20.95.191/255.255.224.0", "172.20.95.191", 19),
        ("10.0.0.1/0", "10.0.0.1", 0),
        ("10.0.0.1/32", "10.0.0.1", 32),
    ],
)
def test_parse_accepts_the_usual_spellings(text, ip, prefix):
    (got,) = run_node("console.log(JSON.stringify([Subnet.parse(input[0])]));", [text])
    assert got["ok"] is True
    assert got["prefix"] == prefix
    assert got["ip"] == int(ipaddress.ip_address(ip))


@pytest.mark.parametrize(
    "text",
    [
        "abc",
        "172.20.95/19",
        "172.20.95.256/19",
        "172.20.95.191/33",
        "172.20.95.191/-1",
        "1.2.3.4/255.0.255.0",
        "1.2.3.4/",
    ],
)
def test_parse_rejects_nonsense_with_a_message(text):
    (got,) = run_node("console.log(JSON.stringify([Subnet.parse(input[0])]));", [text])
    assert got["ok"] is False
    assert got["error"]


def test_parse_tells_empty_input_from_a_mistake():
    (got,) = run_node("console.log(JSON.stringify([Subnet.parse(input[0])]));", ["   "])
    assert got == {"ok": False, "empty": True}


def test_challenges_are_valid_and_balanced():
    results = run_node(
        """
        let seed = 224;
        const rng = () => {                       // mulberry32 : le même tirage à chaque exécution
          seed = (seed + 0x6d2b79f5) | 0;
          let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        const out = [];
        for (let i = 0; i < 900; i++) {
          const c = Subnet.randomChallenge(rng);
          out.push([Subnet.toDotted(c.ip), c.prefix, c.kind, Subnet.analyze(c.ip, c.prefix).kind]);
        }
        console.log(JSON.stringify(out));
        """,
        None,
    )
    kinds = {"network": 0, "host": 0, "broadcast": 0}
    for ip, prefix, asked, computed in results:
        assert asked == computed, f"{ip}/{prefix}"
        assert 9 <= prefix <= 30
        assert prefix % 8 != 0
        assert ipaddress.ip_address(ip).is_private, ip
        kinds[asked] += 1
    assert all(count > 200 for count in kinds.values()), kinds
