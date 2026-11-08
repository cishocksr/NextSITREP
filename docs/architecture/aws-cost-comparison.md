# AWS Development cost comparison

Planning date: **2026-11-05**. Currency USD; region assumption **us-east-1**; **730 hours/month**. These are engineering estimates, **not AWS quotes or verified account bills**. No credits, promotional Free Tier, Savings Plans, Reserved Instances or Spot discounts are subtracted. Development only; Management-account baseline spend and future Production are not silently included.

Architecture definitions and trust boundaries: [architecture proposal](aws-development-architecture.md). Approval is conditional on a fresh [AWS Pricing Calculator](https://calculator.aws/) estimate for the selected region/SKUs, engine, networking and retention, reviewed before provisioning. Regional price tables are dynamic; where an exact current SKU rate was not obtained, a range is explicitly used instead of inventing a rate.

## Common assumptions

- Low synthetic-test traffic: about 10 GiB/month internet egress, 100,000 requests, database under 1 GiB; actual measurements do not exist. TLS/nonce SSR still needs full server capacity.
- ARM64 t4g.medium (2 vCPU/4 GiB) is the A/B candidate; image/ARM/Bun/Next compatibility is unverified. x86 fallback needs re-quotation. No build workload runs on that host.
- A: encrypted 20 GiB root plus 20 GiB DB gp3. B: 20 GiB app root plus private RDS with at least 20 GiB managed storage. C: two Linux/x86 Fargate tasks, each 0.5 vCPU/2 GiB, RDS as B. Any ARM discount for C is deliberately not assumed.
- B/C RDS budget is a small Single-AZ db.t4g.micro-class PostgreSQL instance plus storage, in standard engine support. The memory size is a trial candidate, not a validated DB capacity. No Multi-AZ standby, RDS Proxy, replicas, extended support or provisioned extras are hidden in that number.
- Four Secrets Manager secrets; bounded APIs; AWS-managed encryption keys unless policy requires a separately priced customer-managed key. Root key/rotation automation is not free by implication.
- One Dev DNS zone or allocated incremental DNS cost, about 2 GiB retained ECR images, 0.5 GiB/month redacted log ingestion and 14-day logs, a small number (about four) of custom metrics/alarms. Large default agent metric sets are not included.
- A logical backups: 14 days plus small incremental snapshot retention, roughly 5–10 GiB snapshot blocks and small compressed dumps initially. B/C: seven-day automated backup/PITR plus limited manual snapshots. Backups, recovery drills and orphaned snapshots can exceed these allowances.
- A/B have no ALB, NAT gateway, CloudFront or interface endpoints in the baseline. Outbound connectivity uses the EC2 public IPv4/Internet Gateway. C has an ALB; public-task and private-task egress variants are priced separately. Public IPs do not mean open application/database ports.
- Data/backup/log estimates assume region-local services. Cross-AZ application/DB traffic is budgeted modestly, not asserted zero; cross-region/cross-account replication is extra. Public/private IPv4 counts exclude future scaling or replacement overlaps.

## Pricing evidence and verification status

| Input | Evidence / model | Status and action |
| --- | --- | --- |
| EC2 t4g.medium | Model **$24–30/month** continuous Linux compute. AWS's [2024 published example](https://d1.awsstatic.com/events/Summits/nysummit24/MIG202-S_Dynatrace_MigrateModernize_E4_NYSummit_20240710.pdf) showed $0.0336/hour, about $24.53 at 730 h. | Historical reference, **not a current SKU quote**. Confirm selected-region On-Demand rate, 4 GiB sizing, AMI/architecture, CPU-credit mode and any software charge using [EC2 pricing](https://aws.amazon.com/ec2/pricing/on-demand/). |
| Public IPv4 | AWS pricing page lists **$0.005/address-hour**, used or idle; one retained address = **$3.65/month**. | Current published rate reviewed. Count every address, including ALB/task/NAT addresses. [VPC pricing](https://aws.amazon.com/vpc/pricing/). |
| gp3 | A model **$1.60–2.00 per 20 GiB/month**; baseline IOPS/throughput only. AWS gives a $0.08/GB-month regional pricing example. | Confirm actual us-east-1 storage rate and no provisioned extras. [EBS pricing](https://aws.amazon.com/ebs/pricing/). Snapshots are additional. |
| Managed PostgreSQL | Model **$14–22/month combined instance + 20 GiB storage**, not an invented hourly RDS SKU price. | **Must obtain current RDS quote**, engine/region availability and standard-support status. Do not use a headline compute-only price. [RDS PostgreSQL pricing](https://aws.amazon.com/rds/postgresql/pricing/). |
| Fargate Linux/x86 | Published Virginia example: CPU $0.000011244/vCPU-second, memory $0.000001235/GB-second. Two 0.5-vCPU/2-GiB tasks: 730*3600*(1*CPU + 4*memory) = **about $42.53/month**. | Published example verified, not a capacity guarantee. Confirm selected platform/rate, included ephemeral storage and rollout overlap. [Fargate pricing](https://aws.amazon.com/fargate/pricing/). No persistent PostgreSQL on ephemeral task disks. |
| ALB | Published example: $0.0225/hour + $0.008/LCU-hour. At 730 h: **$16.43 base**, **$0.58–5.84** for modeled 0.1–1 average LCU, plus IPv4. | Verify actual new/active connections, processed bytes and rule evaluations; the largest LCU dimension bills. [ALB pricing](https://aws.amazon.com/elasticloadbalancing/pricing/). |
| NAT | Model standard one-AZ gateway at $0.045/hour = **$32.85/month**, plus per-GB processing and an IPv4 address. | Published regional examples, confirm selected AZ/region/gateway type. Do not omit cross-AZ traffic or count a regional multi-AZ gateway as one hourly unit. [VPC pricing](https://aws.amazon.com/vpc/pricing/). |
| Secrets | Published $0.40/secret-month: **$1.60 for four**, plus about $0–0.10 bounded API use in this model. | Current example reviewed. Rotation workers/KMS may add costs. [Secrets Manager pricing](https://aws.amazon.com/secrets-manager/pricing/). |
| Other service allowances | Tables below use deliberately bounded estimates, not exact claimed rates. | Quote [CloudWatch](https://aws.amazon.com/cloudwatch/pricing/), [S3](https://aws.amazon.com/s3/pricing/), [ECR](https://aws.amazon.com/ecr/pricing/), [Route 53](https://aws.amazon.com/route53/pricing/), [CloudTrail](https://aws.amazon.com/cloudtrail/pricing/) and [data transfer](https://aws.amazon.com/ec2/pricing/on-demand/#Data_Transfer) for the real usage/organization. |

Parameter Store standard SecureString is an alternative that can reduce secret storage charges, subject to API/KMS/rotation and IAM design. It is not the baseline because default SSM-agent managed permissions need careful review before storing secrets there. Do not attach a broad policy and assume an extra narrow Allow restricts it. The saving is small relative to database/restore ownership. [SSM pricing](https://aws.amazon.com/systems-manager/pricing/).

## Always-on monthly line-item model

Numbers are USD ranges; rounding is intentional. No domain registration/renewal is included here.

| Component | A: EC2 + local PG | B: EC2 + RDS | C-public: Fargate + RDS | C-private: Fargate + RDS + 1 NAT |
| --- | ---: | ---: | ---: | ---: |
| EC2/Fargate compute | 24–30 | 24–30 | 42.53 | 42.53 |
| App/root + local DB EBS | 3.20–4 | 1.60–2 | 0 (task ephemeral baseline only) | 0 (same) |
| RDS instance + persistent storage | 0 | 14–22 | 14–22 | 14–22 |
| Public IPv4 | 3.65 (one EIP) | 3.65 (one EIP) | 14.60 (2 ALB + 2 task) | 10.95 (2 ALB + 1 NAT) |
| ALB hourly base | 0 | 0 | 16.43 | 16.43 |
| ALB LCU estimate | 0 | 0 | 0.58–5.84 | 0.58–5.84 |
| NAT gateway hourly | 0 | 0 | 0 | 32.85 |
| NAT processing | 0 | 0 | 0 | 0.05–1 |
| Logical backups / incremental snapshots / extra retained DB backups | 1–2 | 0.50–2 | 0.50–2 | 0.50–2 |
| Logs, metrics and alerts | 1–3 | 1–3 | 1.50–4 | 1.50–4 |
| Registry storage/requests | 0.20–0.80 | 0.20–0.80 | 0.20–0.80 | 0.20–0.80 |
| Four secrets + bounded APIs | 1.60–1.70 | 1.60–1.70 | 1.60–1.70 | 1.60–1.70 |
| Dev DNS zone / queries allowance | 0.50–1 | 0.50–1 | 0.50–1 | 0.50–1 |
| Internet / regional transfer allowance | 0–1 | 0.50–2 | 0.50–2 | 0.50–2 |
| Incremental audit storage/requests | 0.10–0.50 | 0.10–0.50 | 0.10–0.50 | 0.10–0.50 |
| **Approximate subtotal** | **35–48** | **48–69** | **94–114** | **123–144** |
| **Planning/approval range with modest contingency** | **36–48** | **50–70** | **95–120** | **130–160** |

IPv4 assumptions are minimum modeled counts, not maximums. Scaling/deployment overlap and ALB behavior can increase them. C-private has no public task IPs; its NAT address is already in the IPv4 row and is not charged twice. ALB spans two subnets/AZs even if only one task per service is running. That alone does not make the app or DB HA. No separate ECS control-plane charge is assumed for ordinary Fargate services; billed compute, ingress, network and storage remain.

If a domain is not already owned, add its actual annual purchase/renewal cost. For sensitivity only, **$12–24/year** adds **$1–2/month amortized**; this is not a domain quote. Domain billing is usually annual, not monthly. A then becomes roughly **$37–50** economic monthly cost. A second delegated zone, external monitoring or certificate/DNS tooling may add cost.

## Cost controls and sensitivity

| Change | Consequence |
| --- | --- |
| Run A only 80 hours/month | Compute about $2.60–3.30 using the modeled range; retain EBS, EIP, secrets, DNS, backups and alarms. Plan roughly **$14–22/month AWS**, plus domain, with no writes while stopped and a verified pre-stop backup. This is a schedule proposal, not implemented automation. Idle EIP still costs $3.65/month if retained. |
| Release IP/delete compute between sessions | May reduce IP cost but needs reviewed DNS/restore/recreation procedures; EBS/snapshots/secrets still bill. Never auto-delete DB storage to hit a spending target. |
| Add CloudFront to A/B | Not baseline. Quote pay-as-you-go or applicable current plan, requests/data/logging and a protected HTTPS origin/certificate workflow. Model a provisional **$1–5/month low-traffic allowance**, not a guaranteed bill; dynamic HTML stays uncached. [CloudFront pricing](https://aws.amazon.com/cloudfront/pricing/). |
| Move from A to B | Adds managed DB cost, reduces local volume/DB maintenance, improves recovery tooling; approximate $15–25 incremental depending on quote/retention. Does not automatically add HA. |
| Downsize to 2 GiB | Potentially saves compute, but Next SSR + JVM + PG has not been shown to fit. Not the baseline; pass capacity/backup/restart tests first. |
| Scale C for Production | >=2 tasks per service, Multi-AZ RDS and redundant egress add substantial costs. Illustrative **$210–300+** depending on sizing; obtain a new full quote, not an extrapolated SLA. |
| Add a second NAT AZ | About another $32.85 hourly model/month plus IPv4 and processing. One NAT in C-private is a cost/availability tradeoff. |
| Choose VPC endpoints instead of NAT | Interface endpoints have per-AZ hourly/data charges; multiple endpoints can cost more than the savings. They do not provide VA/Nominatim internet access. Verify provider IPv6 before proposing IPv6-only egress. |
| Stop RDS | Storage/backups still cost; RDS automatically restarts a stopped instance after seven days. Do not model permanent free paused managed DB. [RDS stop behavior](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_StopInstance.html). |
| Sustained bursts or oversized logs | Unlimited CPU credits, storage growth, transfer and log/metric cardinality can materially exceed the estimate. Set explicit resource/log/retention limits and watch credit balances. |

Excluded, requiring separate pricing if required: taxes, labor/on-call support, paid AWS support, GitHub Actions overages/ARM runners, WAF, advanced GuardDuty/Security Hub/Config/Inspector features, customer-managed KMS key fixed/API charges, cross-region/account backup replication, extra AZs, HA capacity, email/recovery delivery services, paid external provider usage and Organization-wide existing costs. No paid trials are treated as permanently free. Mandatory organizational controls must be added to the budget, not switched off to preserve this estimate.

Proposed alerts: actual spend around $25/$35/$45 and forecast above the approved range, with a named owner and root-cause review. Budgets/alerts are delayed notifications, not hard caps. Approve a higher ceiling or a Development-only runtime schedule if the current Calculator quote exceeds $40. No automated destructive cost enforcement is proposed for Production or persistent databases.

## Required price sign-off before implementation

- Confirm region, architecture/OS, 730-hour versus scheduled use and current EC2/RDS SKU rates.
- Confirm PostgreSQL standard-support engine version, storage minimum/type, burst credits, backup and restore charges.
- Confirm all IPv4 counts, internet/regional/cross-AZ paths, ALB LCU dimensions and NAT/endpoints decision.
- Confirm certificate/domain method, required organizational security services and who pays shared DNS/audit costs.
- Save the dated Calculator estimate and unit-rate evidence with the approval record; revisit after one week and one month of actual usage.
