+++
title = "It has been a long time"
date = 2021-05-31T00:09:39+08:00
tags = ["fpv, drone, micro, mini, 3-inch, quadcopter, hobby, racing, freestyle, 5-inch, switchback, wind, electronics, esc, flight-controller, hglrc"]
+++

It has been a long time since I have written my [last post](@/2020-10-26-Micro-or-Mini-quad.md). I would say I have accomplished the minimum prerequisite of what I wanted to do with fpv, either micro or mini quads. I have built my own quads with my own selected components. They are not ideal or the best that it can be, as I only have few months of experience building and flying a DIY. But they are not bad either.

I can't believe COVID isn't over yet, but that doesn't stop me to build and fly. However, the pace of building and flying has plateaued for a moment, until I can find the right moment again, after I finished the most important step in my life, which is to buy my own property: my first house. I won't talk about that process here, as it would make this post very long.

What did I learn so far?

I have built two racing quads with 5-inch frame configuration, 6S (six Lithium Polymer battery cells) powered motors, ESC (Electronic Speed Controller), and FC (Flight Controller). I could write the details of my build, but I have written one of my builds on my DVR recordings here:

{{ youtube(id="VgKQDRRUn1c") }}

My first 5-inch build was HGLRC Wind 5 Lite frame with HGLRC tower stack F722 FC + 45A 4-in-1 ESC. However, due to my blunder, the FC, radio receiver (Archer RS), and the VTX was fried just before I was about to fly it. I have tested with smoke stopper and multimeter before I plug it in directly to the battery. But, possibly due to messy wirings (as the stack is very tight) it caused a short circuit. I wasn't actually sure what was the cause.

While my second build is a Five33 Switchback frame with the same HGLRC electronics, as recorded on the above video.

Lesson learned:

 1. In a tower stack configuration, make sure to have enough space between the ESC <-> FC JST connector. If you like to layout the motor wires on top of the ESC, make sure this doesn't occupy the space of the JST connector. Otherwise, it may cause signal connection issues between the FC & ESC. 
 2. My recommendation for motor wirings is to use something like racewire which connects to the ESC motor pads in between each of the motor. A WS2812 LED board can be used for the same purpose as well. This will make motor replacement easier, and the overall wiring to be much cleaner. In this case you only need to re-solder the racewire / LED board pads near the end of each arm.
 3. Do some initial pre-configuration on your ESC firmware if you're running 6S. This is to prevent the voltage / current spikes that's likely to happen on a higher powered build. In addition to soldering Low ESR capacitor at the battery lead. On BLHeli_32 firmware you might need to reduce rampup power and setting Demag compensation to High. Checkout [Mini Quad Test Bench](https://www.miniquadtestbench.com/) for detailed explanation of BLHeli_32 configuration.
 4. Always do a continuity check on your battery lead, and between the (+) of your battery lead to each of the motor pins of your 4-in-1 ESC, then do the same for the (-) lead. This must be done before **and** after soldering all the motors and XT60 / XT30 connectors. I have shorted one motor pin on a brand new T-Motor Ultra F55A mini 4-in-1 ESC. Which could not be known what was the root cause if I didn't do this continuity check before soldering.
 5. A lot of Betaflight filtering guide tend to advise 5-inch quad to reduce filtering, by moving the D-term and Gyro low-pass filter sliders to 1.5 to reduce delay. Don't do this if your motor is warm even at 1.3 silder value. I have blown up one FET in an ESC of my HGLRC Wind 5 quad, because it slightly hit a tree branch, and one motor was stuck. In this case the motor will heat up, and without enough filtering, it may fry one of the ESC. I replaced this with the T-Motor F55A ESC, but one of the FETs broke again :(

For some reason, I encountered these issues only on a high-powered 6S build. I didn't have these weird issues on a 4S build. It signifies the extra care required when you're building, configuring or flying a higher voltage build such as 6S and above. 

I did however encounter video electrical noise issue on an All-In-One board powered by 4S where one board has the FC + ESC, but that's  happening at different component. It's a common issue where the closer the video signal is to the source of noise in power supply, the more likely it will be disturbed. I cleaned up the wirings and installed a 25V 1000uF Panasonic FM Low ESR capacitor. But, it's not a severe problem that require me to replace my FC / ESC / Motor.

In conclusion, a lot of these annoying issues can be prevented by having clean wirings, solder joints, and more experience in troubleshooting electronics of our own build.
