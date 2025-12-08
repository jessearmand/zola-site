+++
title = "Camera Industry's Software Problem: A Lens from the Codebase"
date = 2025-12-07T00:00:00+08:00
tags = ["cameras", "software", "SDK", "360 cameras", "DJI", "Insta360", "robotics", "machine vision", "AI"]
+++

About five years ago, I started experimenting with Insta360 and DJI SDKs. Since then, I've prototyped integrations and attempted to bring them into production applications: processing wide-angle and 360° footage from Insta360 cameras, building drone integrations with DJI's ecosystem within allocated project windows. (I haven't yet explored DJI's action cameras or their newer Osmo 360.) In that time, one thing has become painfully clear: the hardware these companies ship is genuinely impressive. But somewhere around my hundredth encounter with undocumented API behavior, my attempt to reverse-engineer the logic inside their libraries, and yet another mobile app update that somehow doesn't improve the user experience, I started thinking about the bigger picture.

This isn't a rant about bad documentation. It's an attempt to understand why the camera, and drone-camera, industry is where it is in 2025, where it's heading, and why companies making some of the best optics and sensors in the world seem incapable of shipping software worthy of their hardware.

---

## The State of Things: Hardware Paradise, Software Neglect

Let me start by giving credit where it's due.

The 2025 360° camera market is brutally competitive. Insta360 shipped the X5. DJI entered the market with the Osmo 360. GoPro finally delivered the Max 2 after six years of silence. These cameras shoot 8K, have swappable lenses, offer "AI-powered" stabilization (whatever that means in marketing), and, at least on paper, can record for over an hour without thermal throttling.

Action cameras have climbed the same curve. DJI's Osmo Action 5 Pro has a sensor that legitimately outperforms GoPro in low light. Insta360's Ace Pro 2 shoots 8K with a flip-out screen aimed squarely at vloggers. Tiny cameras like the Insta360 Go 3S clip to your shirt and disappear.

From a pure hardware perspective, we're living in a golden age. Sensors are bigger. Stabilization is better. Thermal engineering is exceptional. The form factors keep shrinking.

And yet.

When I try to _use_ these cameras for anything beyond point-and-shoot, everything falls apart.

The mobile apps are sluggish and bloated. The editing workflows feel like they were designed by people who have never tried to edit footage under time pressure. The SDKs feel like artifacts carved out of the main app late in development: barely tested, inconsistently maintained, and full of surprising behavior you discover only by crashing into it.

These SDKs exist so a company can claim "we have an SDK," not to seed a real third-party ecosystem.

---

## The Silent Failure Culture

You don't have to take my word for it. Just browse the GitHub repos for the official SDKs: [CameraSDK-Android](https://github.com/Insta360Develop/CameraSDK-Android/issues), [iOS-SDK](https://github.com/Insta360Develop/iOS-SDK/issues), and [Insta360_OSC](https://github.com/Insta360Develop/Insta360_OSC/issues).

What you find isn't a list of exotic edge cases. It's fundamental functionality that doesn't work reliably. These examples are from the Android SDK repository:

- Developers debugging for weeks why their apps crash instantly when opening a preview stream ([Issue #115](https://github.com/Insta360Develop/CameraSDK-Android/issues/115)).
- Capture listeners, callbacks that tell your app "the camera finished taking a photo," simply not triggering on newer models ([Issue #108](https://github.com/Insta360Develop/CameraSDK-Android/issues/108)).
- Basic record commands like `startNormalCapture`, `startHDRCapture`, and `startNormalRecord` failing to function correctly on the X5 ([Issue #109](https://github.com/Insta360Develop/CameraSDK-Android/issues/109)).
- Android 14 connection failures over Wi-Fi, a critical blocker for any modern mobile app ([Issue #66](https://github.com/Insta360Develop/CameraSDK-Android/issues/66)).
- Software updates breaking older hardware support, with capture status listeners going silent on the X2 after an upgrade ([Issue #112](https://github.com/Insta360Develop/CameraSDK-Android/issues/112)).

APIs that worked for the X3 and X4 quietly broke on the X5 without a single line of documentation explaining the change. Critical issues acknowledged by multiple developers across months sit with zero official response.

This creates a development environment where you're not simply writing code: you're constantly reverse-engineering the device just to detect which parts of the API are real and which are illusions.

This is not how a platform behaves. It's how a side-product behaves.

---

## How Did We Get Here? The Hardware Company Trap

To understand this, you have to look at how companies like Insta360 and DJI are structured.

Both emerged from Shenzhen's hardware ecosystem, the most advanced manufacturing cluster for consumer electronics on the planet. If you need sensors, motors, battery systems, precision optics, or thermal assemblies built at scale and speed, Shenzhen is the place.

That heritage shapes everything:

- Their best engineers work on hardware: sensor tuning, stabilizing algorithms, gimbals, custom silicon, thermal models.
- Software is viewed as **COGS**: a cost required to make hardware shippable, not a product in itself.
- SDKs are maintained by whoever has bandwidth, they can be junior staff or contractors.
- Tools, documentation, and developer experience are subordinate to hardware deadlines.

When the hardware team says, "We launch on the 15th," the software team ships whatever they have. Quality is optional. Schedules are not.

This isn't malice. It's incentives.

Hardware companies measure success in units shipped, defect rates, and BOM costs. Software quality cannot be tracked in those dashboards. So it atrophies.

---

## The Talent Problem

The other elephant in the room: if you're a strong iOS or Android engineer in 2025, you have options.

You can:

- Work at Apple, shipping apps used by billions.
- Join Google or Meta and work on cutting-edge ML or CV.
- Join a frontier AI lab—OpenAI, Anthropic, xAI, or DeepMind—building applications on foundation models.
- Join a startup with real equity upside.
- Or… work on a camera company's mobile app team, maintaining an overburdened editing interface that gets deprioritized whenever a new camera is about to launch.

The gravitational pull toward frontier AI companies is particularly strong right now. The best mobile, frontend, and backend engineers are flocking to labs building the next generation of AI applications. The compensation is competitive, the problems are novel, and the sense of working on something historically significant is hard to match.

There's also a structural shift happening in mobile development itself. Cross-platform frameworks—React Native, Flutter, Kotlin Multiplatform—have become mature enough that many companies are consolidating their mobile teams. Native iOS and Android specialists are finding fewer opportunities unless they work at companies where platform-specific optimization genuinely matters. For hardware companies that aren't operating at the frontier of what's possible, this compounds the recruiting problem: why specialize in native development for a camera app when the industry is moving toward cross-platform, and the most interesting native work is happening at Apple or in AI labs?

It's not hard to see why recruiting world-class software engineers is difficult for hardware-centric companies.

The result:

- Understaffed software teams
- Contractors building to spec
- Talented engineers who love cameras but lack institutional support
- Architecture shaped by deadlines, not design
- Accreted APIs layered over technical debt
- Sparse test coverage
- "Just ship it" engineering culture

You can feel all of this in the SDKs: inconsistent error handling, missing documentation, features bolted onto brittle codepaths.

---

## Is It Fixable?

The software problems at companies like Insta360 and DJI are real and structural, but they're not fundamental. This is accumulated neglect, not irreparable architectural damage. The underlying capabilities exist: these companies have working video processing pipelines, functional device communication layers, rendering engines that produce acceptable output. What they lack is the layer of polish, reliability, and developer experience that separates professional software from adequate software.

The core vision and video processing algorithms are likely already written in C or C++, and that's fine—the language isn't the problem. The issues are in the SDK layer: inconsistent API design, missing error handling, sparse documentation, and inadequate testing at the integration boundary. These are solvable with better processes, not better compilers.

What's missing is software leadership: people who understand what good looks like and have the organizational authority to make it happen. Not just technical leads, but people who can make the case to executives that software quality is a strategic priority, not a cost center. People who can recruit and retain good engineers. People who can shield their teams from the deadline pressure that produces rushed, buggy releases.

---

## The Profit Margin Trap

Here's where things get complicated, and where I have more sympathy for these companies than my frustration might suggest.

Apple can afford massive software investment because they make enormous margins on hardware and have built recurring revenue streams through services. When you buy a $500 Insta360 X5, Insta360's margin on that sale is thin—they're competing with DJI on price, they're paying for components that have gotten more expensive, and they're running a manufacturing operation with significant fixed costs. There's not a lot of room in that margin to fund a hundred-person software engineering team.

Apple sells a $1,200 iPhone with 40%+ gross margins, then extracts $15/month from you for iCloud storage, then sells you Apple Music and Apple TV+ and Apple Fitness+. They have multiple revenue streams that fund software development, and their hardware margins are high enough to absorb significant R&D costs.

Insta360 sells you a camera once. Maybe you buy some accessories. Maybe you upgrade in two or three years. That's it. The entire revenue they'll ever extract from you has to cover the cost of building the hardware, the software, the support infrastructure, and leave something for profit.

This creates a structural underinvestment in software even when leadership understands its importance. You can't fund a world-class software team on thin hardware margins. The math doesn't work. So software becomes "good enough"—sufficient to not actively prevent sales, but never excellent enough to be a competitive advantage.

The possible escape routes are:

**Subscription models.** GoPro has tried this with their GoPro Subscription service, bundling cloud storage, editing tools, and camera replacement insurance. The execution has been clumsy, and it feels like nickel-and-diming for features that should be included. But the strategic logic is sound: recurring revenue funds ongoing software development in a way that one-time hardware sales can't.

**Ecosystem lock-in.** DJI is attempting this with the Osmo Mic integration—if you've invested in DJI audio accessories, you're more likely to buy DJI cameras. The problem is that ecosystem lock-in only works if the ecosystem is pleasant to use. If the software is painful, users will avoid going deeper into the ecosystem rather than embracing it.

**Premium pricing.** Leica charges astronomical prices for cameras and uses the margin to fund a smaller, higher-quality operation. But this only works for luxury brands with heritage. Insta360 and DJI are competing on features and value, not prestige.

**Acquisition.** In theory, if a company like Apple, Google, or Adobe bought Insta360, they'd gain hardware expertise they currently lack and could rebuild the software with their own teams and resources. But this scenario is unlikely to materialize: both DJI and Insta360 are headquartered in China, and the regulatory and geopolitical barriers to acquisition by a US tech company are substantial. If acquisition happens, it's more likely to come from a Chinese company—perhaps one of the large Chinese AI labs if the strategic value of camera hardware for embodied AI becomes clear enough. But the Chinese hardware industry seems to operate differently: Xiaomi was never acquired, it just kept growing. These companies may simply remain independent, neither acquired nor acquiring, competing in an increasingly squeezed market.

---

## Why Existing Open Standards (Like Open Spherical Camera) Aren't Enough for Modern 360° Cameras

Whenever developers struggle with the official SDKs, a familiar suggestion appears:
"Why don't 360 cameras just adopt an open standard like Open Spherical Camera (OSC)?"

It sounds reasonable.
In practice, OSC, originally designed by Google for consumer panoramic cameras, falls far short of what modern 360° cameras actually do in 2025.

To understand why, you have to understand how much complexity is hiding behind a single frame of 360° video.

### What a true open standard for 360° cameras would need to support

A real standard for modern 360° cameras would have to express **all the computational steps** that happen between photons hitting the sensors and a usable 360° frame emerging. That includes:

#### 1. Multi-sensor fusion

360° cameras today often have:

- dual sensors with different calibrations
- swappable lenses
- fisheye + ultrawide hybrid modes
- normal + "Me Mode" (single-lens tracking projection)
- vertical vs horizontal sensor orientations

A proper standard must describe not just "dual lens mode," but **how** those sensors fuse over time.

#### 2. Advanced stabilization pipelines

Modern stabilization isn't just "apply a gyro to the footage." It includes:

- IMU fusion (gyro + accelerometer)
- horizon lock and orientation anchoring
- motion-vector aware stabilization
- lens-specific calibration profiles
- shutter/IMU synchronization

OSC does not define any of this.

#### 3. Real-time stitching and projection choices

Stitching is no longer a static factory calibration. It now requires:

- dynamic seam adjustment
- optical flow warping
- exposure and white-balance matching
- multi-band blending
- projection mode switching (fisheye, rectilinear, equirectangular, proprietary "follow me" projections)

A 360° frame is not "just" an equirectangular output anymore.
OSC doesn't even attempt to model this complexity.

#### 4. Metadata for spatial computing and machine vision

The future of 360° cameras isn't social media. It's:

- robotics
- drones
- autonomous systems
- VR/AR spatial mapping
- embodied AI training
- large-scale scene understanding

These applications need:

- per-frame camera pose
- IMU streams with timestamps
- magnetometer data
- rolling-shutter timing offsets
- depth hints or disparity maps
- motion vectors
- stitching parameters
- lens-specific calibration profiles

To be fair, OSC can handle basic camera settings—exposure, ISO, shutter speed, white balance. These are standard camera parameters that any API can expose. The problem isn't the basic controls. It's the computational metadata that makes 360° footage useful for machine vision: the per-frame orientation, the IMU synchronization, the proprietary calibration data that lets you interpret what the pixels actually mean in 3D space. This is what OSC doesn't model, and what each manufacturer guards as proprietary.

#### 5. State & performance telemetry

Modern cameras are constrained by:

- thermal budgets
- encoder throttling
- battery limits
- SD card write bandwidth
- dynamic bitrate systems

A program needs to adapt to these states. While basic telemetry like battery level and temperature could be added to OSC (these are straightforward hardware queries), the deeper issue is the dynamic behavior: how a camera throttles encoding when it gets hot, how it adjusts bitrate based on SD card speed, how it balances capture quality against thermal headroom. These are system-level behaviors that vary by manufacturer and model, and they're not easily standardized.

### Why Open Spherical Camera falls short

Open Spherical Camera was designed in the era of the **Ricoh Theta S**, when 360° cameras were essentially:

> Two fisheye lenses + a simple blend + JPEG or MP4 output.

OSC was designed for:

- simple capture
- basic preview
- file management
- a fixed processing pipeline

In 2025, a 360° camera is much closer to:

> A computational imaging system with dozens of hidden layers of stitching, fusion, projection, and stabilization, almost none of which can be standardized without losing what makes each camera good.

OSC can't meaningfully describe:

- the complexity of the modern stabilization pipeline,
- how to programmatically tune stitching based on motion,
- how to expose multi-sensor metadata for robotics,
- how to access per-frame orientation and pose,
- the difference between a stabilized stream and a raw one,
- or how to safely control modes that rely on proprietary calibration models.

### The problem isn't openness. It's alignment with modern reality.

Developers don't necessarily need every algorithm to be open.
What they need is:

- predictable APIs
- consistent metadata
- per-frame sensor information
- clear behavior across camera generations
- reliable control surfaces
- meaningful error reporting
- documentation that matches reality

And above all: **determinism**.

An open standard that stops at capture/start/stop/preview/file listing simply isn't enough for what modern 360° hardware is capable of, or what developers now need from it.

### The future standard must treat 360 cameras as software-defined sensors

A real 360° camera standard must embrace the fact that these devices are no longer simple imaging tools. They are:

- pose-tracked
- IMU-synchronized
- heavily computational
- machine-vision relevant
- spatially aware
- multi-sensor fused
- thermally managed
- metadata rich

Open Spherical Camera wasn't built for this world.

The industry desperately needs a standard that **reflects what a 360° frame actually is in 2025**: a computational product, not just a stitched JPEG sphere.

Until that happens, proprietary SDKs will continue to dominate.
And as long as those SDKs remain fragile, inconsistent, and under-resourced, the entire ecosystem: developers, researchers, robotics teams, and the companies themselves, remains boxed in by software limitations rather than hardware potential.

---

## The Strategic Threat: Missing the AI / Robotics Era

Here's the part the camera industry seems completely blind to:

The biggest future market for action and 360 cameras isn't social media creators. It's **machine vision**.

Robotics companies, autonomous vehicle research labs, and embodied AI startups need:

- Wide-FOV cameras
- Ruggedized sensors
- High-resolution video
- Gyro + IMU metadata
- Spatially rich datasets
- Reliable programmatic APIs
- Precise timestamps

Insta360 or DJI could be the _standard camera_ for:

- indoor robots,
- delivery bots,
- humanoid robots,
- telepresence systems,
- warehouse automation,
- agricultural robotics,
- autonomous drones.

Instead, engineering teams bypass these cameras entirely and choose industrial sensors like RealSense, ZED, OAK-D, or Basler because those devices have:

- predictable APIs
- deterministic data streams
- stable firmware
- real developer support
- documentation that doesn't lie

By treating SDKs like afterthoughts, camera companies are effectively **locking themselves out of the single biggest long-term market for cameras: AI perception systems**.

This is the tragedy: **they already have the perfect hardware for robotics**, they just don't have the software quality required to convince robotics teams to adopt it.

There are signs that some companies see this. Insta360 has recently branched into drones, entering direct competition with DJI. But notably, they're targeting the enterprise market rather than consumers—inspection drones, industrial applications, commercial surveying. This is a strategic hedge: the enterprise market requires different go-to-market strategies, longer sales cycles, and deeper integration work, but it's also less price-sensitive and more tolerant of specialized tooling.

Whether the enterprise market is large enough to matter is another question. Apple made a similar bet with Vision Pro, positioning it initially as an enterprise device for specialized workflows rather than a consumer product. The jury is still out on whether that market can sustain the R&D investment required. For camera companies, the enterprise pivot might be a pragmatic acknowledgment that consumer markets are increasingly dominated by smartphones and that professional/industrial applications offer more defensible niches—if they can get the software quality up to enterprise standards.

---

## Meanwhile, Smartphones Ate the World

While action camera companies wrestled with their SDKs, smartphones made most casual photography irrelevant.

Computational photography let phones leapfrog their physical limits:

- multi-frame HDR
- super-resolution zoom
- ML-based denoising
- semantic segmentation
- real-time scene classification
- stabilization using hardware + ML
- instant capture → edit → share workflows

A smartphone is a software-defined camera. It is built as one cohesive system.

A dedicated action cam is still treated like an appliance.

This is the existential squeeze: why fight with a clunky app when your iPhone 17 Pro gives you better image processing, instant editing, and zero-friction workflows?

---

## The Apple Inevitability

This is the elephant that hasn't entered the room yet.

Apple hasn't shipped a dedicated wearable or action camera, but the pieces are aligned:

- Neural engines optimized for image processing
- A decade of computational photography
- LiDAR for spatial sensing
- Vision Pro as a statement of spatial computing seriousness
- The most successful wearable ecosystem in human history (AirPods + Apple Watch)

When Apple eventually ships camera-enabled smart glasses or a wearable capture device, it will be deeply integrated:

- Capture
- Edit
- Sync
- Share
- Archive
- Spatial processing
- ML enhancement

All with Apple-grade UX.

They don't need to match Insta360 or DJI on specs. They just need to be _good enough_ while being dramatically better at software, flow, tooling, APIs, and ecosystem.

Developers will flock to Apple's APIs. And the current players will be racing to define their niches before Apple erases the middle of the market.

---

## What Survival Looks Like

If Insta360, DJI, and GoPro want to stay relevant, software must become a first-class function, not an afterthought.

This means organizational change: software leadership with authority to delay hardware launches when SDKs aren't ready, competitive compensation for engineers, and metrics that reflect software quality alongside unit sales.

**Treat API contracts as commitments, not suggestions.** The pattern across these SDKs is that behavior changes silently between camera generations. What works on the X4 breaks on the X5 without changelog entries, migration guides, or deprecation warnings. Big organizations tend to ignore API stability because it doesn't show up in feature announcements—but it's exactly what determines whether developers can build reliably on your platform. Semantic versioning, explicit deprecation cycles, and behavioral consistency aren't glamorous, but they're what separates a platform from a product.

**Close the feedback loop with the developer ecosystem.** The GitHub issue trackers are full of detailed bug reports from developers who've done the debugging work. They've identified root causes, provided reproduction steps, and suggested fixes. These reports sit without acknowledgment. The organizational failure isn't that bugs exist—it's that there's no visible process for triaging, prioritizing, or communicating status. Even a "won't fix" is more valuable than silence.

**Own the niches Apple won't touch.** Apple will dominate convenience and the general consumer market. Camera companies must dominate capability: extreme durability, 360° capture, professional mounting scenarios, robotics vision systems, long-duration capture, and high-FOV sensors. This is a smaller market than "consumer photography," but it's defensible.

**Invest in developer experience as a strategic asset.** Professional users, researchers, and developers are high-margin customers who will pay for products that work reliably. But they'll only buy products they can actually integrate into their workflows. That means accurate documentation, stable APIs, and not breaking integrations with firmware updates.

---

## Where I Really Am on This

I started this essay frustrated, and I'm ending it somewhere between pragmatism and pessimism.

The hardware being built today is extraordinary. I love working with 360° footage and spatial video. But every time I interact with the SDKs or the apps, I'm reminded how much friction remains between "impressive technology" and "delightful product."

DJI has proven it can execute world-class products when it prioritizes something. Insta360's hardware innovation is real: they've repeatedly pushed their categories forward. The raw capability exists.

What's missing is the recognition that software isn't just a cost center—it's the difference between a tool and a platform, between something that enthusiasts tolerate and something that normal people love, between a company that gets disrupted by Apple and a company that builds a defensible business.

I don't know if that recognition will come in time. The structural pressures I've described are real, and organizational change is hard. But the technology exists to build great camera software, and the talent exists to build it if companies can attract and retain it. The question is whether hardware-first companies can evolve before software-first companies like Apple make their hardware irrelevant.

If someone from Insta360 or DJI wants to tell me I'm wrong—that they're investing heavily in software quality and it just hasn't shipped yet—I would be glad to hear it.
