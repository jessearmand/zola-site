+++
title = "Private Cloud Compute, agent sandboxes, and what I can build without Apple"
date = 2026-10-26T10:30:00+08:00
description = "Comparing Apple's Private Cloud Compute with confidential computing on other clouds, with agent sandboxes like Strands Box, SPACE and OpenShell, and with Firecracker, then working out what an independent developer could actually build."
tags = ["privacy", "security", "confidential computing", "Apple", "Private Cloud Compute", "agents", "sandbox", "firecracker", "AI"]
+++

I took a brief look at Apple's [Private Cloud Compute](https://security.apple.com/blog/private-cloud-compute/) (PCC) and couldn't work out how I'd actually use it, so I let Grok Bot explore the code Apple publishes in [apple/security-pcc](https://github.com/apple/security-pcc) and the docs around it to find out. The short answer is that I can't. PCC is the inference backend for Apple Intelligence. Apple runs it, Apple signs every binary on it, and the only thing a third-party developer gets is an API. Since WWDC26, an app can swap `SystemLanguageModel` for `PrivateCloudComputeLanguageModel` in the Foundation Models framework and send prompts and tool calls to Apple's server model ([WWDC26 session](https://developer.apple.com/videos/play/wwdc2026/319/)). That's a Swift API that only exists on iOS, macOS, watchOS and visionOS 27 or later, only on devices that support Apple Intelligence, and every user gets a daily request limit ([Apple docs](https://developer.apple.com/documentation/foundationmodels/adding-server-side-intelligence-with-private-cloud-compute)). Even that API is gated: you need to be in the App Store Small Business Program, have fewer than 2 million first-time downloads, and hold a PCC entitlement ([eligibility](https://developer.apple.com/private-cloud-compute/)). And the repo itself is under a license that allows 90 days of use on a single Apple-branded computer, "for the sole purpose of verifying the security and privacy characteristics" of PCC.

My next question was whether "PCC on Google Cloud" meant I could run macOS, or Apple's stack, on my own Google Cloud account, and the answer is no. The original PCC nodes are custom Apple-silicon servers running a hardened OS built from iOS and macOS foundations, and the Google Cloud nodes are Intel TDX confidential VMs with NVIDIA Blackwell GPUs and Google's Titan chip ([Apple](https://security.apple.com/blog/expanding-pcc/), [NVIDIA](https://blogs.nvidia.com/blog/nvidia-confidential-computing-apple-private-cloud-compute/)). The Google Cloud code in the repo ([CloudAttestation-GoogleCloud](https://github.com/apple/security-pcc/tree/main/CloudAttestation-GoogleCloud), [CloudBoard-GoogleCloud](https://github.com/apple/security-pcc/tree/main/CloudBoard-GoogleCloud)) measures a Linux boot chain and uses systemd, so there's no macOS there either. Either way, Apple builds and signs every release, publishes it for inspection, and Apple devices only trust nodes running that software, so where PCC runs is Apple's decision and not something I can deploy to or reproduce on my own account. My only touchpoint as a developer is the API from an app.

This post is what came out of that, extended to the questions I actually care about: what PCC guarantees, how it compares with other platforms and with this year's agent sandboxes, and how much of it I could rebuild on hardware I can rent.

<figure style="margin:1.5rem 0;">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 752" role="img" aria-labelledby="pcc-fit-title pcc-fit-desc" style="display:block;width:100%;max-width:30rem;height:auto;margin:0 auto;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<title id="pcc-fit-title">Where Private Cloud Compute fits</title>
<desc id="pcc-fit-desc">Three stacked boxes. Top: agent sandboxes (Strands Box, SPACE, OpenShell, Firecracker) protect the host from untrusted agent or guest code, and the operator is trusted. An arrow says the trust direction flips. Middle: confidential computing (Nitro Enclaves, SEV-SNP and TDX confidential VMs, NVIDIA GPU confidential computing, Confidential Containers, and private inference services from Meta, Google, Azure, Tinfoil and Privatemode) protects user data from the operator using remote attestation. An arrow says plus PCC's extras. Bottom: Apple PCC, same direction, adding no admin or debug access, Apple-vetted hardware and supply chain, a client OS that refuses unattested nodes, and a public append-only transparency log.</desc>
<defs>
<marker id="pcc-fit-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0,0 L10,5 L0,10 z" fill="#6b7280"/>
</marker>
</defs>
<rect x="1" y="1" width="438" height="164" rx="10" fill="#f3f4f6" stroke="#9ca3af" stroke-width="1.5"/>
<text x="20" y="34" font-size="21" font-weight="700" fill="#111827">Agent sandboxes</text>
<text x="20" y="62" font-size="17" fill="#374151">Strands Box · SPACE · OpenShell · Firecracker</text>
<text x="20" y="98" font-size="17" fill="#111827">Protect the <tspan font-weight="700">HOST</tspan> from untrusted</text>
<text x="20" y="120" font-size="17" fill="#111827">agent or guest code.</text>
<text x="20" y="148" font-size="17" fill="#6b7280" font-style="italic">The operator is trusted.</text>
<line x1="220" y1="168" x2="220" y2="214" stroke="#6b7280" stroke-width="2" marker-end="url(#pcc-fit-arrow)"/>
<text x="234" y="196" font-size="16" fill="#4b5563" font-style="italic">trust direction flips</text>
<rect x="1" y="222" width="438" height="252" rx="10" fill="#eef4fb" stroke="#7a9cc6" stroke-width="1.5"/>
<text x="20" y="255" font-size="21" font-weight="700" fill="#111827">Confidential computing</text>
<text x="20" y="283" font-size="17" fill="#374151">Nitro Enclaves · SEV-SNP / TDX CVMs</text>
<text x="20" y="305" font-size="17" fill="#374151">NVIDIA GPU CC · Confidential Containers</text>
<text x="20" y="339" font-size="17" fill="#374151">Private inference built on these:</text>
<text x="20" y="361" font-size="17" fill="#374151">Meta · Google · Azure · Tinfoil · Privatemode</text>
<text x="20" y="397" font-size="17" fill="#111827">Protect <tspan font-weight="700">USER DATA</tspan> from the</text>
<text x="20" y="419" font-size="17" fill="#111827"><tspan font-weight="700">OPERATOR</tspan>, backed by remote attestation.</text>
<text x="20" y="455" font-size="17" fill="#6b7280" font-style="italic">You (or the vendor) pick the software.</text>
<line x1="220" y1="477" x2="220" y2="523" stroke="#6b7280" stroke-width="2" marker-end="url(#pcc-fit-arrow)"/>
<text x="234" y="505" font-size="16" fill="#4b5563" font-style="italic">+ PCC's extras</text>
<rect x="1" y="531" width="438" height="218" rx="10" fill="#dfe9f6" stroke="#3d6fa8" stroke-width="2.5"/>
<text x="20" y="564" font-size="21" font-weight="700" fill="#111827">Apple Private Cloud Compute</text>
<text x="20" y="592" font-size="17" fill="#374151">Same direction as above, plus:</text>
<text x="20" y="624" font-size="17" fill="#111827">• No admin or debug access, even for Apple</text>
<text x="20" y="650" font-size="17" fill="#111827">• Apple-vetted hardware and supply chain</text>
<text x="20" y="676" font-size="17" fill="#111827">• Client OS refuses unattested nodes</text>
<text x="20" y="702" font-size="17" fill="#111827">• Public, append-only transparency log</text>
<text x="20" y="732" font-size="16" fill="#6b7280" font-style="italic">Apple alone picks the software.</text>
</svg>
<figcaption style="text-align:center;font-style:italic;font-size:0.95rem;margin-top:0.5rem;">Where PCC sits: sandboxes protect the host from the workload; confidential computing and PCC protect user data from whoever runs the host.</figcaption>
</figure>

## What PCC promises

Apple's original post lists five requirements, and everything else here gets measured against them: **stateless computation** (user data is used only for the request, isn't visible to Apple staff, and isn't kept, logs included), **enforceable guarantees** (nothing outside the trust boundary, like a TLS-terminating load balancer, can be part of the privacy story), **no privileged runtime access** (no shell, no debugger, no loading new code), **non-targetability** (compromising a few nodes doesn't let you steer a specific user's request to them), and **verifiable transparency** (devices only talk to nodes whose software measurements are in a public append-only log).

The implementation details are what make these more than a policy document. Requests are encrypted on the device to the public keys of specific, attested nodes, so load balancers and gateways can't read them. Only code in a trust cache signed by Apple and loaded by the Secure Enclave can run, which also rules out JIT. The Secure Enclave randomises the data volume key on every reboot, so storage is cryptographically wiped. There's no general-purpose logging, only pre-specified structured metrics. Requests go through a third-party OHTTP relay, carry an RSA blind-signature credential instead of a user identity, and are encrypted to a small subset of nodes, so a single compromised node only ever sees a small slice of traffic ([Apple, June 2024](https://security.apple.com/blog/private-cloud-compute/)).

The Google Cloud nodes from the intro serve the heavier Gemini-derived Apple Foundation Models, and two lines in Apple's [June 2026 post](https://security.apple.com/blog/expanding-pcc/) stood out to me. Apple says it doesn't rely solely on confidential computing to stop privileged attackers outside the VM, side channels included, and that components which could leak user data are attested against "at least two separate roots of trust from independent vendors". It also says Apple "retains complete control over PCC software". The hardware got more ordinary. The software ownership didn't change.

## What other platforms give you

Outside Apple there are general-purpose building blocks, and a handful of "private inference" services that assemble them into something PCC-like. The table compares them on the guarantees from the previous section.

| | Protects data from the operator | Attestation rooted in | Who picks the software | Public transparency log | Non-targetability |
|---|---|---|---|---|---|
| Apple PCC (Apple silicon) | Yes | Secure Enclave, Apple-issued node certs | Apple only | Yes, append-only | OHTTP relay, blind-signature tokens, node subsets |
| Apple PCC on Google Cloud | Yes, plus defences beyond CC | TDX, NVIDIA GPU, Titan (two independent roots) | Apple only | Yes | Same model |
| AWS Nitro Enclaves | From the parent instance, yes | Nitro Hypervisor (AWS) | You | No, you build it | No |
| SEV-SNP / TDX confidential VMs | From host and hypervisor, yes | AMD / Intel silicon (plus cloud firmware on some) | You | No | No |
| NVIDIA GPU CC (H100, Blackwell) | GPU memory and CPU-GPU traffic | NVIDIA per-device keys via SPDM | You | No | No |
| Confidential Containers (Kata) | Each pod VM is itself the CVM | CPU TEE, verified by Trustee | You | No | No |
| Meta Private Processing | Yes | CVM + CC-mode GPUs, RA-TLS | Meta | Third-party log (Cloudflare) | OHTTP via a third-party relay, anonymous credentials |
| Google Private AI Compute | Yes (as claimed) | AMD TEE, Titanium Intelligence Enclaves | Google | Not that I could confirm | Third-party IP-blinding relays |
| Azure confidential inferencing | Yes | SEV-SNP + H100 | Microsoft | Yes, ledger of container hashes | OHTTP, optional external proxy |
| Tinfoil, Privatemode | Yes | SEV-SNP/TDX (Tinfoil); CPU plus GPU evidence (Privatemode) | The vendor, open source | Sigstore and CT logs (Tinfoil); published, reproducible manifest (Privatemode) | Not covered in what I read |

Nitro Enclaves are carved out of a parent EC2 instance's CPUs and memory, have no network and no persistent storage, and talk to the outside only over vsock ([AWS](https://docs.aws.amazon.com/enclaves/latest/user/nitro-enclave-concepts.html)). That's a nice shape for stateless code, but the attestation document is signed by the Nitro Hypervisor, so AWS is your root of trust, and the enclave only gets CPU and memory. Azure's confidential GPU VMs encrypt traffic between CPU and GPU, and the boot path goes through a Microsoft-provided paravisor that you're trusting as part of the measurement ([Azure deep dive](https://techcommunity.microsoft.com/blog/azureconfidentialcomputingblog/azure-ai-confidential-inferencing-technical-deep-dive/4253150)). Google Cloud has a TDX confidential VM with one attached H100 (`a3-highgpu-1g`), offered in three zones ([supported configurations](https://docs.cloud.google.com/confidential-computing/confidential-vm/docs/supported-configurations)).

The services look a lot like PCC on paper. Beyond what's in the table, Meta's [Private Processing](https://engineering.fb.com/2025/04/29/security/whatsapp-private-processing-ai-tools/) terminates RA-TLS inside the CVM, has no remote shell, uses Fastly for the OHTTP infrastructure ([whitepaper](https://ai.meta.com/static-resource/private-processing-technical-whitepaper)), and runs its service binaries in containers inside the CVM. Google's [Private AI Compute](https://blog.google/innovation-and-ai/products/google-private-ai-compute/) runs on TPUs ([InfoQ](https://www.infoq.com/news/2025/11/google-private-ai-compute-tee/)).

So the big vendors have landed on the same pattern of OHTTP plus attestation plus a log. What still separates PCC, in my reading, is the set of extras in the diagram above. The client-OS one matters most to me: the refusal happens in the operating system, not in an app the user might not update.

The primitives also aren't as solid as the marketing suggests. In October 2025, [TEE.fail](https://tee.fail/) showed that a DDR5 memory bus interposer, buildable for under $1,000, can extract keys from TDX and from SEV-SNP with Ciphertext Hiding, including Intel's per-CPU provisioning certification key, which lets an attacker forge TDX attestations ([Intel advisory](https://www.intel.com/content/www/us/en/security-center/announcement/intel-security-announcement-2025-10-28-001.html)). Because NVIDIA's GPU attestation isn't bound to a specific CVM, the authors could also "borrow" a GPU attestation from hardware they didn't own. Intel and AMD both treat physical interposers as out of scope, so the mitigation is physical security of the server. My guess is that results like this are why Apple's Google Cloud post spends so much space on not relying solely on confidential computing, and on having two independent roots of trust.

## Where agent sandboxes fit

This year there's a wave of open source agent sandboxes, the top box in the diagram. I read the primary sources for three of them, plus the [Strands Box launch post](https://strandsagents.com/blog/strands-box-the-big-picture/).

[Strands Box](https://github.com/strands-agents/box) runs an agent under the OS sandbox (the preview is macOS-only; the repo description calls Linux support planned) and routes shell commands, Python, MCP calls and network requests through a trusted process outside the sandbox that evaluates Dogwood policy. Paths granted directly in `box.toml` are enforced by the OS and don't get a policy decision. Marc Brooker's post explains why they put policy in user space: at the virtual NIC level of a microVM you mostly see TLS ciphertext, which is a bad place to express a rule like "allow this agent to git push, but only if tests are passing". The design docs are blunt about the threat model: "The sandbox protects the surrounding system from the box, and not the box from anything", and "Do not read a box as a confidentiality boundary for its own contents." The effective-policy report is described as "diagnostic, not an attestation". For multi-tenant cloud use, the post recommends pairing Box with a per-session Firecracker microVM, for example AgentCore Runtime.

[SPACE](https://github.com/perplexityai/SPACE) from Perplexity is the cloud-side equivalent: a platform, deployed on Kubernetes in its guides, that runs each sandbox in its own Firecracker microVM, with an egress gateway that can intercept TLS and inject credentials. Sandboxes can be suspended, which takes "a snapshot of VM memory, runtime state, and root filesystem", and worker services move snapshots to and from object storage. Its architecture doc says it directly: "Firecracker isolates guest execution. Host-side services still require privileges to manage VMs, storage, and networking." And on binary measurement, "path replacement by host root is outside this guarantee." That's the right threat model for untrusted code, and the opposite of PCC's statelessness, since the operator can snapshot everything.

NVIDIA's [OpenShell](https://github.com/NVIDIA/OpenShell) calls itself "the safe, private runtime for fleets of autonomous AI agents". It uses Landlock for filesystem limits, seccomp and privilege drop for process limits, and a policy proxy that every outbound connection goes through; credentials are only attached to requests to approved endpoints. It can run on Docker, Podman, Kubernetes, or a libkrun microVM ([support matrix](https://docs.nvidia.com/openshell/latest/about/support-matrix)), and it uses formal verification to flag risky policy changes before they're approved. The "private" here means the agent can't leak your data or secrets. Its attestation is supply-chain only: SBOMs attached to published images. Nothing proves to a remote user what's running.

| | Isolates | Protects whom from whom | Isolation tech | Remote attestation |
|---|---|---|---|---|
| Strands Box | Agent process and its tools | Host from agent | Seatbelt (macOS); namespaces + syscall filter (Linux, ARM64); policy in user space | No |
| SPACE | Untrusted code per sandbox | Host and tenants from guest | Firecracker microVM on KVM, jailer, Kubernetes | No |
| OpenShell | Agent process | Host, secrets, network from agent | Landlock, seccomp, netns proxy; optional libkrun microVM | No (SBOM attestations for images) |
| Apple PCC | User request data | User from operator (Apple included) | Apple silicon + SEP, or TDX + GPU CC | Yes, checked by the client OS |

So the two are complementary. If you want an agent that touches user data on a server and you want both properties, there are two practical shapes. Either each microVM is itself the confidential VM, one TDX or SEV-SNP guest per session, the way Confidential Containers runs Kata pods. Or a process-level sandbox (Box, OpenShell, something gVisor-like) runs inside a confidential VM, with its binaries, policy and config included in the attested measurement. Firecracker inside a confidential VM isn't one of them, for reasons in the next section. Apple and Meta already use the process-level shape: Apple parses requests in a dedicated process in its own namespace, and Meta runs its binaries in containers inside the CVM.

## Firecracker and PCC are solving different problems

Firecracker's [design doc](https://github.com/firecracker-microvm/firecracker/blob/main/docs/design.md) says "all vCPU threads are considered to be running malicious code as soon as they have been started", and builds nested trust zones from the guest (least trusted) to the host (most trusted). Its job is keeping strangers' code away from the host and from each other.

| | Firecracker microVM | Apple PCC |
|---|---|---|
| Who's untrusted | The guest code | The operator, the data centre, a few compromised nodes |
| Who's trusted | Host kernel, VMM, operator | Apple's signed software (as logged), the silicon |
| Trust boundary | KVM + minimal device model + jailer | Node TEE (SEP, or TDX/GPU CC) and the client device |
| Hardware root of trust | None for the guest; host secure boot is up to the operator | Secure Enclave UID-rooted certs, or TDX + NVIDIA + Titan |
| Attestation | None to a remote party | Client verifies node measurements against the public log |
| Statelessness | Optional; snapshots are a feature | Required; storage keys rotate on reboot, no general logs |
| Operator can read guest memory | Yes (my reading of how KVM works) | Designed so it can't |

They also don't stack the obvious way, with Firecracker running inside a confidential VM. The Confidential Containers [design overview](https://confidentialcontainers.org/docs/architecture/design-overview/) says "Most confidential computing hardware does not support nesting", and Canonical's TDX releases list "Nested virtualization is not supported" as a known limitation ([canonical/tdx](https://github.com/canonical/tdx/releases)). Confidential Containers sidesteps it with Peer Pods, which ask the cloud API to launch each Kata pod VM as a first-level CVM. That's the first of the two shapes from the previous section, and the confidentiality comes from the TEE rather than from the microVM's isolation.

## Building something PCC-shaped without Apple

Say I want a small inference or agent service where I, as the operator, provably can't read user requests. No Apple silicon, no macOS, no Secure Enclave. Here's the stack I'd use, based on what exists today.

**Hardware.** Rent confidential GPU VMs: TDX with an H100 on Google Cloud, or SEV-SNP with an H100 on Azure. Use NVIDIA's [nvtrust](https://github.com/NVIDIA/nvtrust) tooling for GPU attestation. For CPU-only parts like a key service or a router, Nitro Enclaves are fine, as long as I accept AWS as the root.

**Image.** One minimal, read-only image per release, with no SSH, no shell, no debug agent, and logging limited to an allowlist of structured metrics. Make it [reproducible](https://reproducible-builds.org/) so anyone can rebuild it and get the same measurement. Privatemode publishes its trusted components for exactly this reason ([privatemode-public](https://github.com/edgelesssys/privatemode-public)), and Google's [Project Oak](https://github.com/project-oak/oak) works on the same problem.

**Transparency.** Sign each release in CI with Sigstore so the measurement lands in the public [Rekor log](https://docs.sigstore.dev/logging/overview/). Using a log I don't run matters, because I shouldn't be able to remove an entry quietly.

**Client-side verification.** This is the most important part. Before sending anything, the client fetches the attestation report, checks the chain to AMD, Intel or NVIDIA, checks that the measurement is in the log, and encrypts to a key bound inside the report. [Tinfoil](https://docs.tinfoil.sh/verification/verification-in-tinfoil) is the clearest open source example I found; its SDKs do this on every connection and deliberately avoid third-party attestation services, which they call "circular security". If you'd rather not run the stack at all, using Tinfoil or Privatemode directly gets you most of the way, with a vendor you can at least verify.

**Non-targetability.** Put an [OHTTP](https://www.rfc-editor.org/rfc/rfc9458) relay run by someone else in front, authenticate with anonymous or blind-signed tokens instead of user IDs, and have the client choose among several attested nodes.

**Statelessness.** No persistent disk, an ephemeral memory-only key for any scratch space, short-lived workers that recycle, and no break-glass. If something breaks, I redeploy a new logged image.

**Agents.** If the service runs tools on user data, use one of the two shapes from the sandbox section. With [Confidential Containers](https://confidentialcontainers.org/docs/attestation/), Trustee releases secrets only to attested pods.

Then there's what I can't copy. I don't get a Secure Enclave with code signing that locks out JIT and unsigned code at the kernel level; dm-verity and a locked-down Linux get close, but it's a weaker guarantee that I'd have to build myself. I don't get Apple's hardware supply chain (component imaging, tamper switches, third-party observers), and after TEE.fail I'm trusting the cloud provider's physical security whether I like it or not. Probably the biggest gap: I don't control the client OS. My verification lives inside my own app or SDK, so users still trust that I shipped an honest client, and as far as I know browsers have no built-in way to check attestation. Non-targetability also needs scale. With two GPU nodes, there's no crowd to hide anyone in; that's my inference, but I think it's simple arithmetic.

Cost and effort: confidential GPU VMs run at GPU prices, and I didn't try to price a deployment. My rough estimate is weeks of focused work for one person to get the image, reproducible build, signing pipeline and client verifier right, and then the ongoing work of keeping them correct. A proper audit is a different scale: NCC Group's review of Meta's system was 115 person-days.

## Conclusion

PCC is the most complete version of a pattern the rest of the industry is converging on, but it's Apple's system end to end, and its strongest guarantees come from controlling the software, vetting the hardware and owning the client. The agent sandboxes answer a different question, and the interesting work is combining the two without nesting. For an independent developer, the stack above gets most of the way there. The hardware supply chain and the client OS are what's left, and those are the parts that turn "verifiable" into "enforced".
