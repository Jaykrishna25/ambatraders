import { useState } from 'react';
import Navbar from './components/Navbar/Navbar.jsx';
import Hero from './components/Hero/Hero.jsx';
import ProductCategories from './components/ProductCategories/ProductCategories.jsx';
import Products from './components/Products/Products.jsx';
import WhyChooseUs from './components/WhyChooseUs/WhyChooseUs.jsx';
import About from './components/About/About.jsx';
import Location from './components/Location/Location.jsx';
import Contact from './components/Contact/Contact.jsx';
import Footer from './components/Footer/Footer.jsx';

export default function App() {
  // Shared so category cards and footer links can pre-filter the product grid.
  const [category, setCategory] = useState('all');

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      <main id="main">
        <Hero />
        <ProductCategories onSelect={setCategory} />
        <Products category={category} onCategory={setCategory} />
        <WhyChooseUs />
        <About />
        <Location />
        <Contact />
      </main>
      <Footer onCategory={setCategory} />
    </>
  );
}
