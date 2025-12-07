+++
title = "Camera Industry's Software Problem: A Lens from the Codebase"
date = 2025-12-07T00:00:00+08:00
tags = ["cameras", "software", "SDK", "360 cameras", "DJI", "Insta360", "robotics", "machine vision", "AI"]
+++

About five years ago, I started experimenting with Insta360 and DJI SDKs. Since then, I've prototyped integrations and attempted to bring them into production applications: processing wide-angle and 360° footage from Insta360 cameras, building drone integrations with DJI's ecosystem within allocated project windows. (I haven't yet explored DJI's action cameras or their newer Osmo 360.) In that time, one thing has become painfully clear: the hardware these companies ship is genuinely impressive. But somewhere around my hundredth encounter with undocumented API behavior, my attempt to reverse-engineer the logic inside their libraries, and yet another mobile app update that somehow doesn't improve the user experience, I started thinking about the bigger picture.

This isn't a rant about bad documentation. It's an attempt to understand why the camera, and drone-camera, industry is where it is in 2025, where it's heading, and why companies making some of the best optics and sensors in the world seem incapable of shipping software worthy of their hardware.

---

## The State of Things: Hardware Paradise, Software Purgatory

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

You don't have to take my word for it. Just browse the GitHub repos for the official SDKs.

What you find isn't a list of issues. It's a **graveyard of silent failures**.

I'm not talking about exotic edge cases. I mean fundamental functionality. For example:

- Developers debugging for weeks why their apps crash instantly when opening a preview stream (Android Issue #115).
- Capture listeners, callbacks that tell your app "the camera finished taking a photo," simply not triggering on newer models (Issue #108).
- APIs that worked for the X3 and X4 quietly breaking on the X5 without a single line of documentation explaining the change.
- Critical issues acknowledged by multiple developers across months, with zero official response.

This creates a development environment where you're not simply writing code: you're constantly reverse-engineering the device just to detect which parts of the API are real and which are illusions.

This is not how a platform behaves. It's how a side-product behaves.

---

## How Did We Get Here? The Hardware Company Trap

To understand this, you have to look at how companies like Insta360 and DJI are structured.

Both emerged from Shenzhen's hardware ecosystem, the most advanced manufacturing cluster for consumer electronics on the planet. If you need sensors, motors, battery systems, precision optics, or thermal assemblies built at scale and speed, Shenzhen is the place.

That heritage shapes everything:

- Their best engineers work on hardware: sensor tuning, stabilizing algorithms, gimbals, custom silicon, thermal models.
- Software is viewed as **COGS**: a cost required to make hardware shippable, not a product in itself.
- SDKs are maintained by whoever has bandwidth, often junior staff or contractors.
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
- Join a startup with real equity upside.
- Or… work on a camera company's mobile app team, maintaining an overburdened editing interface that gets deprioritized whenever a new camera is about to launch.

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
- sensor temperature and thermal state
- exposure/ISO/shutter history

OSC provides **none** of these.

#### 5. State & performance telemetry

Modern cameras are constrained by:

- thermal budgets
- encoder throttling
- battery limits
- SD card write bandwidth
- dynamic bitrate systems

A program needs to adapt to these states. OSC offers no vocabulary for them.

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

That means:

### 1. Software Leadership with Authority

Leaders who can say "the SDK isn't ready; the launch must slip."

### 2. Developer Experience as a Product

Fix the silent failures.

Document behavior.

Stabilize APIs.

Stop breaking things quietly.

Design SDKs like they matter.

Because they do.

### 3. Own the Niches Apple Won't Touch

Apple will dominate convenience.

Camera companies must dominate capability:

- extreme durability
- niche form factors
- 360° capture
- multi-camera rigs
- robotics vision systems
- long-duration capture
- high-FOV sensors

These markets are smaller, but defensible.

### 4. Embrace the Machine Vision Era

The robotics and AI markets are enormous.

But only reliable, programmatic access to your hardware unlocks them.

Right now, the industry is actively throwing that opportunity away.

---

## Where I Really Am on This

I began writing out of frustration, and I'm ending somewhere between pragmatism and pessimism.

The hardware being built today is extraordinary. I love working with 360° footage and spatial video. But every time I interact with the SDKs or the apps, I'm reminded how much friction remains between "impressive technology" and "delightful product."

DJI has proven it can execute world-class products when it prioritizes something. Insta360's hardware innovation is real: they've repeatedly pushed their categories forward. The raw capability exists.

What's missing is recognition that in 2025, a camera is no longer just a box with lenses.

A camera is a **software-defined sensor at the edge of a computational ecosystem**.

Software isn't a cost center.

It's the difference between:

- a tool and a platform
- a novelty and a necessity
- a product enthusiasts tolerate and a product normal people love
- winning the AI/robotics market or being erased from it

Whether hardware-first camera companies can evolve before software-first giants reshape the category is an open question.

But the window is shrinking.

If someone from Insta360 or DJI wants to tell me I'm wrong, that they're investing heavily in software quality and it just hasn't shipped yet, I would love to be wrong. Truly.
