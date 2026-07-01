# SK Hynix Interview Prep — Continuing Context

## Interview details

**Date:** Wednesday, June 3rd, 2026 at 1:00 PM
**Location:** 3103 N First St, San Jose CA 95134, Walnut conference room
**Duration:** 3 hours, 5 rounds

---

## What has been covered and is solid

### Weibull analysis and bathtub curve

- Bathtub curve: three phases, infant mortality (beta < 1), random failures (beta = 1), wear-out (beta > 1)
- Infant mortality is caused by latent manufacturing defects surfaced under early stress, not normal drives failing randomly
- Burn-in testing: applied at the factory on enterprise drives to surface infant mortality before shipping
- Beta controls the shape of the failure rate curve, eta controls where that shape sits on the time axis
- Both beta and eta are needed to assess warranty exposure. Beta alone doesn't tell you if you're in trouble
- Weibull++ fits one distribution at a time to a dataset. The bathtub curve is a conceptual model combining three separate Weibull distributions
- On a Weibull probability plot, log-log axes make the distribution appear as a straight line. Slope of that line is beta
- Reliability curve (S-curve drop) vs failure rate curve are two different views of the same data
- Confidence bounds on Weibull plots represent uncertainty in the fit based on sample size

### RDT (reliability demonstration testing)

- RDT demonstrates that a product meets a reliability spec with statistical confidence
- Three levers: sample size, test duration, acceleration factor (stress level)
- Fewer units requires longer test duration or higher stress to maintain the same confidence claim
- Zero failures can be statistically sufficient if sample size and duration are large enough
- Acceleration for SSDs is expressed as a multiple of DWPD, compressing years of wear into weeks
- Demonstrating reliability is pass/fail against a known spec. Measuring reliability is exploratory, finding where the product actually breaks

### 4 corners and margin testing

- 4 corners: test at all four combinations of voltage and temperature extremes simultaneously
- Interaction effects between parameters can create failure modes that neither parameter alone would surface
- Real deployments don't experience one controlled variable at a time, 4 corners mirrors real conditions
- Margin testing pushes beyond rated spec to find how much headroom exists before failure
- A drive that fails at 71 degrees C when rated to 70 degrees C has almost no margin
- Margin testing informs spec confidence, product binning, and whether a design needs rework
- Always verify testing conditions are identical before comparing margin results across designs

### FA/RCA

- Failure analysis starts with forming a hypothesis from available data, timing, batch, symptoms
- Pull SMART logs before touching hardware. The drive often tells its own story
- Physical inspection order: visual first, then X-ray or cross-section if needed
- Lot correlation: check if all failed units share a manufacturing batch number
- Fault tree: work top down eliminating branches. NAND, controller, firmware, assembly, environment
- WAF mismatch between NAND bytes written and host bytes written points to GC/firmware issues vs NAND degradation
- Reproduction is required to close an RCA. Without it the root cause is a hypothesis not a confirmed finding
- RCA report structure: problem statement, timeline, root cause, contributing factors, corrective actions

### fio

Core required flags to know cold:
- `--name` job name
- `--rw` workload type: randread, randwrite, randrw, read, write, readwrite
- `--bs` block size, typically 4k for random IO benchmarks
- `--iodepth` queue depth, requires libaio to actually work
- `--ioengine=libaio` required for async IO and real queue depth
- `--direct=1` bypasses OS page cache, required for accurate benchmarking
- `--runtime` test duration in seconds
- `--size` how much of the drive to operate on
- `--filename` target device, e.g. /dev/nvme0n1
- `--rwmixread=70` for mixed workloads, sets read percentage
- `--numjobs` parallel workers

Key output fields:
- IOPS and bandwidth: overall throughput
- slat: submission latency, time from IO submission to device handoff
- clat: completion latency, time from device handoff to completion
- lat: total end to end latency, slat plus clat
- clat percentiles: 99th and 99.99th percentile tail latency are the key reliability signals
- Tight distribution means consistent performance. Wide distribution with high tail percentile indicates GC pressure or wear

Common mistakes to avoid:
- Forgetting `--ioengine=libaio` causes iodepth to be capped at 1
- Size too small causes the test to finish before runtime, giving burst performance not steady state
- Not preconditioning the drive before benchmarking gives unrealistically clean results

### smartctl

- Command: `sudo smartctl -a /dev/nvme0n1` for full attribute dump
- Use `--json` flag for reliable programmatic parsing
- Key attributes to know: percentage used (wear indicator), available spare (OP health), data units written (host bytes written), NAND bytes written (vendor specific, not always available), power on hours, critical warning
- WAF = NAND bytes written / host bytes written. Ideal is 1.0, above 3-4 in steady state warrants investigation
- Always run smartctl before and after a test to get a meaningful delta
- Not all drives expose NAND bytes written as a standard attribute. It may be in vendor logs

### iostat

- Command: `iostat -x /dev/nvme0n1 2` refreshes every 2 seconds
- Passive monitoring tool, watches what the kernel observes at the block device layer
- Key columns: r/s and w/s (read/write per second), rkB/s and wkB/s (throughput), r_await and w_await (kernel observed latency), aqu-sz (average queue depth), %util (device utilization)
- Use alongside fio during endurance tests for real time visibility
- Does not work correctly in WSL2 for Windows IO activity. Behaves correctly on bare metal Linux

### Python test automation

- Polling function pattern: parameterize frequency, duration, drive, threshold
- Use subprocess.run with shell=True and capture_output=True to run smartctl from Python
- Use json.loads on result.stdout for reliable parsing, requires smartctl --json flag
- Guard clauses before WAF calculation to prevent zero division errors
- Try/except around each interval to survive bad smartctl calls without killing a long running test
- Log rich context in failures list: timestamp, drive, WAF value, raw byte counts
- Catch specific exceptions: json.JSONDecodeError, subprocess.TimeoutExpired
- Continue vs crash: for long running endurance tests, log bad intervals and continue

---

## What still needs work

### fio practice on real hardware

- Need to run a test that actually reaches runtime (60+ seconds) on bare metal Linux
- Practice reading steady state output where GC pressure is visible in tail latency
- Try a precondition fill followed by a steady state benchmark and compare the two outputs
- Experiment with --rwmixread for mixed workloads

### smartctl on real NVMe hardware

- Run sudo smartctl -a on actual NVMe device and read the full output together
- Identify which vendor specific attributes are available on your specific drive
- Calculate WAF from real data units written values
- Understand how to use --json output and navigate the JSON structure

### Python test design

- Write and run the WAF polling function against real smartctl output
- Add the pass/fail function: WAF never exceeded threshold AND final WAF within 10% of starting WAF
- Practice parsing real smartctl JSON output to find the correct field names for your drive
- Design a complete test that combines fio workload generation with smartctl polling

### Philip Lei section (not yet covered)

- Enterprise NVMe features: dual port, SR-IOV, multi-namespace, streams
- Protocol analyzer concepts: what LeCroy/SerialTek tools do and when you'd use them
- Reading lspci output in detail: LnkCap vs LnkSta, confirming PCIe gen and lane width

### Behavioral prep (Richard Zhao and James Park)

- Stories for: debugging under pressure, cross-functional collaboration, self-directed learning, handling ambiguity
- Why SK Hynix specifically, why reliability engineering, why now
- Map Powerside experience cleanly to each interviewer's focus area

---

## Notes on your strengths going in

- You reason from first principles rather than reciting memorized answers, which landed well in the phone screen
- Your Powerside debugging experience (NTP sync issue across 68 units, MQTT log analysis) maps directly to FA/RCA
- Your pytest automation work is real, built, and defensible
- The RAG log analysis tool is a design idea not a built system. Frame it as such
- You understand AI as a software integration problem which is exactly Anh Chu's language
- Be direct, authentic, and let answers be messy. The phone screen interviewer responded well to that
