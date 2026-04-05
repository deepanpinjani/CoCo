"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";

// Make sure GSAP registers ScrollTrigger
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function Page() {
  const scrollExplosionRef = useRef(null);
  const heroRef = useRef(null);
  const cardsRef = useRef([]);
  const listItemsRef = useRef([]);
  const reviewsRef = useRef([]);
  const particlesRef = useRef([]);

  useEffect(() => {
    let ctx = gsap.context(() => {
      // Exact requested GSAP animation for the hero image (reduced scale)
    gsap.fromTo(".waffle-hero-img",
      { scale: 1.15 },
      {
        scale: 1,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero-section",
          start: "top top",
          end: "60% top",
          scrub: 1.5,
        }
      }
    );

    // Section 2: Pinning timeline
    const explosionTl = gsap.timeline({
      scrollTrigger: {
        trigger: ".hero-section",
        start: "top top",
        end: "100% top", 
        scrub: 0.5,
        pin: true,
      }
    });

    // Particle explosion
    particlesRef.current.forEach((el, i) => {
      // Reduced travel distance and scale
      const angle = (Math.random() * Math.PI) * 2;
      const originalDistance = 300 + Math.random() * 200; 
      const tx = Math.cos(angle) * originalDistance;
      const ty = Math.sin(angle) * originalDistance;
      const rot = Math.random() * 720 - 360;

      explosionTl.to(el, {
        x: tx,
        y: ty,
        rotation: rot,
        opacity: 1,
        scale: 0.3, // Greatly reduced size
        ease: "power2.out",
        duration: 3
      }, 0); 
    });

    // Fade out text instructions
    explosionTl.to(heroRef.current, {
      opacity: 0,
      y: -50,
      duration: 1
    }, 0);

    // Section 3: Flavor Cards
    gsap.fromTo(cardsRef.current, 
      { y: 100, opacity: 0 },
      { 
        y: 0, opacity: 1, 
        duration: 1.2, 
        stagger: 0.2, 
        ease: "power3.out",
        scrollTrigger: {
          trigger: "#flavor-section",
          start: "top 70%",
        }
      }
    );

    // Section 4: Scroll List
    listItemsRef.current.forEach((item, i) => {
      gsap.fromTo(item,
        { y: 80, opacity: 0 },
        {
          y: 0, opacity: 1,
          duration: 1.5,
          ease: "power2.out",
          scrollTrigger: {
            trigger: item,
            start: "top 80%",
            end: "top 40%",
            scrub: 1
          }
        }
      );
    });

      gsap.fromTo(reviewsRef.current,
        { y: 50, opacity: 0, scale: 0.95 },
        {
          y: 0, opacity: 1, scale: 1,
          duration: 1,
          stagger: 0.2,
          ease: "back.out(1.7)",
          scrollTrigger: {
            trigger: "#reviews-section",
            start: "top 75%"
          }
        }
      );
    }); // End of gsap.context()

    return () => {
      ctx.revert(); // Let GSAP cleanly unwrap its strictly-managed DOM nodes (fixes React DOM errors)
    };
  }, []);

  return (
    <main className="w-full bg-black min-h-screen text-white overflow-hidden font-sans">
      
      {/* HEADER: CAFE COCO */}
      <header className="absolute top-0 left-0 w-full px-8 py-6 z-50 flex justify-center md:justify-between items-center pointer-events-none">
        
        {/* LOGO CONTAINER HTML RECREATION */}
        <div className="relative flex flex-col items-center justify-center w-40 h-40 pointer-events-auto opacity-90 hover:opacity-100 transition-opacity">
          
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#bf953f" />
                <stop offset="25%" stopColor="#fcf6ba" />
                <stop offset="75%" stopColor="#b38728" />
                <stop offset="100%" stopColor="#fbf5b7" />
              </linearGradient>
            </defs>
            <circle 
              cx="50" 
              cy="53" 
              r="34" 
              fill="none" 
              stroke="url(#goldGrad)" 
              strokeWidth="1.3" 
              strokeDasharray="80 30" 
              strokeDashoffset="10" 
              strokeLinecap="round"
              transform="rotate(-20 50 50)" 
            />
          </svg>
          
          <div className="flex flex-col items-center z-10">
            <span className="font-script text-6xl tracking-tight leading-none" style={{
              background: "linear-gradient(135deg, #bf953f 0%, #fcf6ba 40%, #b38728 80%, #fbf5b7 100%)",
              WebkitBackgroundClip: "text",
              color: "transparent",
              paddingRight: "4px"
            }}>
              CoCo
            </span>
            <span className="text-[#fcf6ba] text-[0.45rem] tracking-[0.2em] font-sans uppercase opacity-90 mt-[-2px]">
              waffles & pancakes
            </span>
          </div>
        </div>

        <nav className="hidden md:flex gap-12 text-[#e8c97a] text-[10px] tracking-[0.3em] uppercase font-bold pointer-events-auto">
          <a href="#" className="hover:text-white transition-colors duration-300">Menu</a>
          <a href="#" className="hover:text-white transition-colors duration-300">Story</a>
        </nav>
      </header>

      {/* SECTION 1 & 2: HERO & EXPLOSION */}
      <section ref={scrollExplosionRef} className="hero-section relative w-full h-screen flex items-center justify-center overflow-hidden">
        
        {/* The single high-res hero image */}
        <div className="absolute inset-0 w-full h-full flex items-center justify-center">
            <Image 
              src="/waffle-hero.png" 
              alt="Cinematic Waffle Hero" 
              fill
              className="waffle-hero-img object-contain md:object-cover origin-center"
              style={{
                willChange: "transform",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transformOrigin: "center center",
                imageRendering: "-webkit-optimize-contrast"
              }}
              priority
            />
        </div>

        {/* Particles flying out (initially hidden/centered) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-10 h-10 pointer-events-none mix-blend-screen">
          {Array.from({ length: 8 }).map((_, i) => (
             <div 
               key={i} 
               ref={el => particlesRef.current[i] = el}
               className="absolute w-24 h-24 opacity-0 drop-shadow-2xl"
             >
                <Image 
                  src={i % 3 === 0 ? "/assets/chocolate1.png" : i % 3 === 1 ? "/assets/chocolate2.png" : "/assets/ice_shard.png"} 
                  alt="particle" 
                  fill 
                  className="object-contain" 
                  priority
                />
             </div>
          ))}
        </div>

        {/* Hero text overlay */}
        <div ref={heroRef} className="absolute bottom-[10%] flex flex-col items-center justify-center z-20 gap-4 mix-blend-difference">
          <p className="text-[10px] md:text-sm tracking-[0.4em] uppercase font-bold text-white/80">
            Scroll to Explore
          </p>
          <div className="w-[1px] h-12 bg-white/40 mb-4 animate-pulse" />
        </div>
      </section>

      {/* SECTION 3: FLAVOR PROFILE */}
      <section id="flavor-section" className="relative w-full py-40 px-6 md:px-12 max-w-7xl mx-auto z-20 bg-black">
        <div className="text-center mb-24">
          <h2 className="font-serif text-5xl md:text-8xl font-black text-white mix-blend-lighten tracking-tighter">
            COMPLEX PROFILE
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { title: "Indulgent", desc: "A deep, satisfying richness that overtakes the senses." },
            { title: "Rich", desc: "Crafted with pure 70% dark Belgian chocolate." },
            { title: "Warm", desc: "Served dripping with perfectly heated Vermont maple." },
            { title: "Crispy", desc: "A satisfying outer crunch giving way to a soft center." }
          ].map((card, idx) => (
            <div 
              key={idx}
              ref={el => cardsRef.current[idx] = el}
              className="bg-[#111111] p-10 flex flex-col gap-4 border border-white/5 rounded-sm"
            >
              <h3 className="text-[#e8c97a] font-serif tracking-widest uppercase text-xl font-semibold">
                {card.title}
              </h3>
              <p className="text-white/60 text-sm leading-relaxed font-light">
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4: INGREDIENTS */}
      <section className="relative w-full py-32 px-6 md:px-24 max-w-5xl mx-auto z-20">
        <div className="flex flex-col gap-32">
          {[
            { tag: "01", title: "Belgian Waffle Batter", desc: "House-made, rested overnight" },
            { tag: "02", title: "Dark Chocolate Ganache", desc: "70% single-origin cocoa" },
            { tag: "03", title: "Warm Maple Syrup", desc: "Pure Vermont grade A" },
            { tag: "04", title: "Chocolate Chips", desc: "Belcolade semi-sweet" }
          ].map((item, idx) => (
            <div 
              key={idx}
              ref={el => listItemsRef.current[idx] = el}
              className="relative flex flex-col md:flex-row items-baseline gap-6 md:gap-12"
            >
              {/* Ghost number */}
              <div className="absolute -left-10 -top-20 md:-top-32 font-serif text-[120px] md:text-[200px] font-black text-white/[0.03] select-none pointer-events-none tracking-tighter z-0">
                {item.tag}
              </div>
              
              <div className="text-[#e8c97a] font-mono text-sm tracking-layout z-10 opacity-70">
                {item.tag} /
              </div>
              <div className="flex flex-col gap-2 z-10 w-full border-b border-white/10 pb-12">
                <h3 className="font-serif text-3xl md:text-5xl text-white font-medium">
                  {item.title}
                </h3>
                <p className="text-white/50 text-lg md:text-xl font-light">
                  — {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 5: REVIEWS */}
      <section id="reviews-section" className="relative w-full py-40 px-6 md:px-12 bg-black z-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { quote: "An absolute masterclass in texture and flavor. The chocolate runs deep.", name: "SARAH V.", role: "FOOD CRITIC" },
            { quote: "It looks like modern art and tastes even better. A sensory experience.", name: "MARCUS T.", role: "PRIVATE CHEF" },
            { quote: "Grid & Drip has redefined the dessert cafe aesthetic. Stunning.", name: "ELENA R.", role: "ARCHITECTURAL DIGEST" }
          ].map((rev, idx) => (
            <div 
              key={idx}
              ref={el => reviewsRef.current[idx] = el}
              className="flex flex-col gap-6 p-8 relative"
            >
              <div className="text-[#e8c97a] tracking-[0.2em] text-sm">
                ★★★★★
              </div>
              <p className="font-serif italic text-white/90 text-2xl leading-relaxed">
                "{rev.quote}"
              </p>
              <div className="mt-auto pt-6 flex flex-col gap-1">
                <span className="font-sans font-bold text-sm tracking-widest uppercase">{rev.name}</span>
                <span className="text-white/40 text-[10px] tracking-[0.3em] uppercase">{rev.role}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 6: PRICE + CTA */}
      <section className="relative w-full h-[80vh] flex flex-col items-center justify-center gap-8 z-20 pb-32">
        <div className="flex flex-col items-center">
          <span className="text-[#e8c97a] text-sm md:text-base tracking-[0.4em] uppercase font-bold mb-4">Starting from</span>
          <h2 className="font-serif text-[120px] md:text-[200px] text-white/100 leading-none tracking-tighter">
            ₹149
          </h2>
        </div>
        <button className="bg-[#e8c97a] text-black px-12 py-5 text-sm uppercase tracking-[0.3em] font-bold hover:bg-white transition-colors duration-500 rounded-sm">
          Order Now
        </button>
        <p className="text-white/40 text-xs md:text-sm tracking-widest font-light">
          Freshly made · Served hot · Amravati, MH
        </p>
      </section>

    </main>
  );
}
