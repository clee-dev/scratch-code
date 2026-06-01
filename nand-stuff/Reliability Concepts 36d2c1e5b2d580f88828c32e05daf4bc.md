# Reliability Concepts

# SSD Interview Study Notes

---

## 1. SATA vs NVMe

SATA and NVMe are storage interfaces that use different protocols. NVMe uses flash-based memory designed for high performance. It has higher bandwidth and throughput with lower latency, and connects directly to the CPU via PCIe. SATA uses a dedicated cable and port connector, was originally designed for HDDs, and was later adapted for SSDs.

**Key distinction:** NVMe = fast, direct CPU path. SATA = legacy, slower, HDD-era design.

---

## 2. AHCI vs NVMe (protocols, not interfaces)

**AHCI** is the protocol for SATA drives. It is a legacy protocol supporting 1 queue with 32 commands. The AHCI controller lives on the motherboard chipset.

**NVMe** supports up to 65,535 queues with 65,535 commands each. The submission and completion queues live in host RAM. The NVMe controller lives on the SSD itself. NVMe runs over PCIe for direct, low-latency CPU access.

**Correction to remember:** AHCI = 1 queue, 32 commands (not 32 queues).

---

## 3. M.2 as a physical slot

M.2 is just a physical slot shape on the motherboard. It supports both NVMe and SATA drives. The protocol is determined by the drive itself, not the slot. Some M.2 slots only support PCIe (NVMe only), so an M.2 SATA drive physically fit but won't work in those slots.

---

## 4. PCIe lanes, generations, and link negotiation

PCIe lanes are high-speed data paths on the motherboard connecting peripherals (SSDs, GPUs) to the CPU. Generations (Gen 3, 4, 5) double bandwidth each time.

Link negotiation always tries to achieve the highest mutually supported speed and width. If a Gen 4 drive negotiates down to Gen 3, that signals a hardware issue such as damaged pins, a bad slot, or a driver problem.

**How to check on Linux:**

```bash
lspci -vvv
```

Look for:

- `LnkCap` = what the device is capable of
- `LnkSta` = what it actually negotiated

A mismatch between LnkCap and LnkSta is a red flag.

---

## 5. NVMe queue model

NVMe uses a submission queue and a completion queue, both stored in host RAM. The CPU writes commands to the submission queue and rings a doorbell register on the controller. The controller reads commands via DMA, processes them, and writes results to the completion queue. An interrupt notifies the CPU when completions are ready.

One queue per CPU core eliminates lock contention that AHCI's single shared queue suffered from.

---

## 6. End-to-end NVMe command flow

1. Application makes a system call to the OS kernel
2. NVMe driver translates the request into an NVMe command and writes it to the submission queue in host RAM
3. Driver rings the doorbell register on the controller
4. Controller reads the command from RAM via DMA
5. FTL translates the logical block address to a physical NAND location
6. Controller sends the operation to the appropriate NAND die(s)
7. NAND executes, possibly in parallel across multiple dies
8. Data returns to the controller buffer
9. Controller writes a completion entry to the completion queue in host RAM
10. CPU receives an interrupt, driver reads the completion, returns data to the application

---

## 7. Latency vs throughput tradeoff

**Latency** = how fast a single operation completes. Lower is better.

**Throughput** = how much data moves in a given time. Higher is better.

As queue depth increases, throughput goes up because the NAND's internal parallelism is better utilized. But latency also increases because commands wait for NAND resources to free up. The NAND dies are the bottleneck, not the queues themselves.

Testing at `iodepth=1` in fio measures single-threaded latency. Spec sheet numbers are usually measured at high queue depth. Always test across a range of queue depths.

---

## 8. NAND cell types

| Type | Bits per cell | P/E cycles | Speed | Cost |
| --- | --- | --- | --- | --- |
| SLC | 1 | ~100,000 | Fastest | Highest |
| MLC | 2 | ~10,000 | Fast | High |
| TLC | 3 | ~1,000–3,000 | Moderate | Consumer |
| QLC | 4 | ~100–1,000 | Slowest | Cheapest |

More bits per cell = higher density, lower cost, worse endurance and speed. More bits means more voltage states crammed into the same range, making them harder to distinguish accurately.

**Correction to remember:** SLC has the widest voltage windows (easiest to read). QLC has the narrowest (hardest, slowest, least durable).

---

## 9. How a NAND cell stores data

NAND cells store data using electron traps. Writing (programming) forces electrons into the trap, raising the voltage threshold needed to turn the cell on. Reading applies increasing voltage until the cell switches, and the threshold at which it switches indicates the stored bit value. Erasing applies high voltage across the entire block to rip electrons out, resetting all cells to their lowest state.

---

## 10. Pages and blocks

| Operation | Level |
| --- | --- |
| Read | Page (smallest readable unit, typically 16KB) |
| Write (program) | Page |
| Erase | Block (contains hundreds of pages) |

NAND cannot overwrite in place. To update data, the block must be erased first. Since erasing is expensive and happens at the block level, the FTL avoids in-place writes entirely.

---

## 11. Why NAND cannot overwrite in place

A NAND cell can only have electrons added to it (programmed) or all electrons removed (erased). You cannot selectively reduce the charge in a single cell without erasing the entire block. This is a physical constraint of how the oxide layer and electron trap work.

As a result, the FTL always writes new data to a clean block, marks the old location as invalid, and lets garbage collection handle the erase later.

---

## 12. Read vs program vs erase timing

**Read (~40 µs):** Passive. Apply voltage, sense whether the cell switches. Nothing changes.

**Program (~390 µs):** Active. Force electrons through the oxide layer into the trap. Physical process takes time.

**Erase (~4 ms):** Active. Apply high voltage across an entire block (hundreds of pages) to pull all electrons out simultaneously. Large scope + high voltage = slowest operation.

---

## 13. FTL (Flash Translation Layer)

The FTL is firmware running on the SSD controller. It sits between the host and the raw NAND and handles:

- **L2P (Logical to Physical) address translation** — maps OS logical block addresses to physical NAND locations. Stored in a table in DRAM on the controller.
- **Garbage collection** — reclaims space from invalid pages
- **Wear leveling** — distributes writes evenly across all blocks
- **Bad block management** — tracks and avoids worn-out cells
- **Abstraction** — makes complex NAND look like a simple block device to the OS

---

## 14. Garbage collection

When data is overwritten, the old physical location is marked invalid but not immediately erased. Over time blocks accumulate a mix of valid and invalid pages. Garbage collection:

1. Finds a block with mixed valid/invalid pages
2. Copies valid pages to a clean block in the overprovisioned reserve
3. Erases the original block entirely
4. Returns the now-clean block to the free pool

**GC pressure** occurs when overprovisioning is nearly exhausted. The controller must do GC just to make room for more GC, creating a recursive loop. This spikes WAF and latency.

---

## 15. Wear leveling

NAND cells degrade with each P/E cycle. Without wear leveling, frequently written blocks would die while others stayed fresh. Wear leveling rotates data across blocks so P/E cycles are distributed evenly across the entire drive, maximizing lifespan.

---

## 16. ECC (Error Correction Code)

As NAND cells degrade, they begin returning incorrect bit values. ECC uses mathematical algorithms to detect and correct a certain number of bit errors before returning data to the host. Cells that fail too frequently are logged in bad block management and avoided for future writes.

---

## 17. Overprovisioning

Overprovisioning is reserved NAND space invisible to the host, used by the FTL for garbage collection staging. When GC needs to move valid pages out of a dirty block, it writes them to the overprovisioned reserve.

Higher overprovisioning = more room for GC = lower WAF = better sustained performance = longer drive life. Lower overprovisioning = less headroom = higher GC pressure = WAF spikes = faster wear.

Enterprise SSDs typically have 28%+ overprovisioning. Consumer drives typically have 7–10%.

---

## 18. WAF (Write Amplification Factor)

WAF = internal NAND writes / host writes

If you write 1GB and the drive internally writes 3GB to accomplish that, WAF = 3. Ideal WAF = 1.

WAF increases due to:

- GC moving valid pages (every copy is an extra write)
- Wear leveling redistributing data
- Frequent overwrites forcing block erases
- Small file writes that don't fill complete pages
- Low overprovisioning causing GC pressure

---

## 19. DWPD and lifetime writes

**DWPD (Drive Writes Per Day)** = how many full drive writes per day over the warranty period (usually 5 years).

**Lifetime total writes = drive capacity × P/E cycle rating**

Example: 1TB TLC drive with 2000 P/E cycles = 2000TB total lifetime writes

At 2TB/day = 1000 days = 2.7 years. Fails before the 5-year warranty.

WAF makes this worse. If WAF = 2, the drive consumes 4TB of internal writes per day, cutting lifespan roughly in half.

---

## 20. MTBF and AFR

**MTBF (Mean Time Between Failures)** = average hours before failure across a population of drives. Usually expressed in millions of hours for enterprise SSDs. A population stat, not a guarantee for any individual drive.

**AFR (Annualized Failure Rate)** = percentage of drives expected to fail per year.

```
AFR = 8760 / MTBF (in hours)
MTBF = 8760 / AFR
```

Example: MTBF of 1.5 million hours → AFR = 8760 / 1,500,000 = ~0.58%

---

## 21. GC pressure

GC pressure occurs when the overprovisioned buffer is exhausted. The controller must reorganize partially invalid blocks just to create staging space for other GC operations. This becomes recursive, causing:

- WAF spikes
- Unnecessary P/E cycle consumption
- Rising tail latency (visible in fio 99th percentile)
- GC stalls where the drive pauses writes entirely to catch up

---

## 22. TRIM

TRIM is a command the OS sends to the SSD when files are deleted. It tells the controller which logical addresses are no longer in use so those pages can be marked invalid immediately.

Without TRIM, the controller has no way to know if a page is actually invalid until the OS overwrites it. GC would copy invalid pages around as if they were valid, causing unnecessary WAF and P/E consumption. TRIM lets GC work during idle time, keeping WAF low and performance stable. It also makes deleted data unrecoverable much faster.

---

## 23. Controller architecture, channels, and parallelism

The SSD controller manages everything: FTL, L2P table, wear leveling, GC, ECC, bad block management, power management, and host interface (PCIe/SATA).

The controller connects to NAND through multiple flash channels. Each channel connects to multiple dies. The controller can send commands down multiple channels simultaneously, and each die operates independently, enabling true parallel execution.

Example: 4 channels × 2 dies each = 8 simultaneous operations possible.

Commands queue up when all dies are busy. The scheduling overhead plus wait time is what drives latency up at high queue depth.

---

## 24. fio basics

fio is a workload generator for benchmarking storage devices.

**Key parameters:**

- `-rw` = workload type (`randwrite`, `randread`, `randrw`)
- `-iodepth` = commands in flight simultaneously (queue depth)
- `-bs` = block size (4K for database-like workloads, 128K for sequential)
- `-runtime` = test duration
- `-ioengine=libaio` = async I/O engine (required to actually hit high queue depths)
- `-direct=1` = bypass OS cache for honest results

**Key output to read:**

- `IOPS` = operations per second
- `BW` = bandwidth/throughput
- `avg` latency = average completion time
- `99.00th` and `99.99th` percentile = tail latency (most important for reliability validation)

In endurance testing, watch for tail latency climbing over time as a sign of GC pressure or NAND wear.

---

## 25. RDT, margin testing, and Weibull

**RDT (Reliability Demonstration Testing):** Structured testing that statistically proves a drive meets its rated reliability specs (MTBF, warranty life) before shipping. Tests enough drives for enough hours to make a statistically confident claim about the population failure rate.

**Margin testing:** Pushes the drive beyond normal operating conditions (voltage, temperature, workload) to find how much headroom exists before failure. A drive that barely passes at spec is riskier than one with wide margins.

**Weibull analysis:** Statistical model used to describe failure rates over a population over time. Models three failure patterns depending on parameters:

- Early failures (infant mortality from manufacturing defects)
- Random failures (constant failure rate)
- Wear-out failures (increasing failure rate as devices age)

These map to the bathtub curve: high failure rate early, low constant rate in middle, rising rate at end of life. Weibull++ is the standard software tool used to run this analysis.

---

## 26. Endurance test structure

**Preconditioning:** Fill the drive completely before measuring. A fresh drive has no GC pressure and gives artificially good numbers. Preconditioning puts the drive into steady state where GC is actively running.

**Steady state:** The ongoing test at rated workload (e.g. 1 DWPD). Monitor continuously.

**What to monitor:**

- Throughput and latency over time (fio output)
- Tail latency at 99th and 99.99th percentile for GC pressure signals
- Wear indicator via smartctl (counts down from 100)
- Total bytes written vs NAND bytes written (calculate WAF)
- Temperature (thermal throttling causes latency spikes)
- Data integrity checks periodically (write known data, read back, compare)

Rising 99th percentile latency is one of the first observable signs of GC pressure building, before any errors appear.

---

## Key formulas

```
Lifetime writes = capacity × P/E cycles
DWPD = total lifetime writes / (365 days × warranty years × capacity)
WAF = NAND bytes written / host bytes written
AFR = 8760 / MTBF (hours)
MTBF = 8760 / AFR
```

---

## Interviewer profiles

| Name | Role | Focus |
| --- | --- | --- |
| Dae Kim | Manager, Reliability | RDT, margin testing, Weibull, Python/Java automation, FA/RCA |
| Anh Chu | Senior Staff Engineer | AI/ML infra, RAG, FastAPI, PyTorch, test automation architecture |
| Philip Lei | Sr Staff Engineer | NVMe/PCIe protocols, enterprise features, Linux tools, fio, smartctl |
| Richard Zhao | Director | Team fit, automation vision, cross-functional collaboration |
| James Park | VP Operations | Culture, leadership, high level fit |