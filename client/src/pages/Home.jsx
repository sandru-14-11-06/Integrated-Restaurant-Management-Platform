import { Link } from 'react-router-dom';
import { ArrowRight, ChefHat, Leaf, ShieldCheck, Sparkles } from 'lucide-react';
import { fallbackImage } from '../utils';

export default function Home() {
  return <div className="landing">
    <nav className="landing-nav"><Link to="/" className="brand-lockup"><span className="brand-symbol">आ</span><span><b>IRMP</b><small>Restaurant OS</small></span></Link><div><Link to="/menu">Explore menu</Link><Link className="button button-outline" to="/login">Team login</Link></div></nav>
    <section className="hero">
      <div className="hero-copy"><span className="eyebrow"><Sparkles size={14} /> A smarter way to serve</span><h1>Good food.<br /><em>Better flow.</em></h1><p>One thoughtful platform for every part of your restaurant—from the first order to the last ingredient.</p><div className="hero-actions"><Link className="button button-primary" to="/menu">Order something lovely <ArrowRight size={17} /></Link><Link className="text-link" to="/login">Restaurant team? Sign in</Link></div><div className="hero-proof"><span><i className="proof-dot" /> Freshly prepared</span><span><Leaf size={15} /> Less food waste</span></div></div>
      <div className="hero-art"><img src="https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=1200&q=85" onError={(e)=>{e.currentTarget.src=fallbackImage;}} alt="Indian curry and fresh naan" /><div className="floating-note"><span className="note-icon"><ChefHat size={18} /></span><span><b>Made with care</b><small>Every plate, every time</small></span></div><div className="hero-sun" /></div>
    </section>
    <section className="landing-values"><div><span className="value-icon orange"><ChefHat /></span><h3>Rooted in flavour</h3><p>Indian favourites, made fresh and served just right.</p></div><div><span className="value-icon green"><Leaf /></span><h3>Good food, shared</h3><p>Surplus finds a second life through our rescue partners.</p></div><div><span className="value-icon purple"><ShieldCheck /></span><h3>Every detail, in sync</h3><p>A calm, connected workspace for the people behind the plate.</p></div></section>
    <section className="landing-cta"><div><span className="eyebrow">A table is waiting</span><h2>Bring a little joy to your day.</h2></div><Link className="button button-light" to="/menu">Browse the menu <ArrowRight size={17} /></Link></section>
    <footer className="landing-footer"><Link className="brand-lockup" to="/"><span className="brand-symbol">आ</span><span><b>IRMP</b><small>Integrated Restaurant Management Platform</small></span></Link><span>Thoughtfully serving, every day.</span></footer>
  </div>;
}
