# 🍔 Food Delivery App - UI Clone

> A pixel-perfect, stunning food delivery application UI built with modern frontend technologies. This project showcases advanced UI/UX design skills with smooth animations and beautiful components.

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)

---

## 🎨 Design Preview

### Light Theme
```
┌────────────────────────────────────────┐
│  🍔 FoodHub          📍 Karachi    🔔  │
├────────────────────────────────────────┤
│                                        │
│  ┌──────────────────────────────────┐  │
│  │     🍕 Delicious Food            │  │
│  │     Delivered to Your Door       │  │
│  │     ═══════════════════════      │  │
│  │     [  Search food...  🔍 ]      │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Categories                            │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐  │
│  │ 🍔 │ │ 🍕 │ │ 🍜 │ │ 🍰 │ │ 🥤 │  │
│  │Burg│ │Pizz│ │Asia│ │Dess│ │Drin│  │
│  └────┘ └────┘ └────┘ └────┘ └────┘  │
│                                        │
│  Popular Near You                [→]   │
│  ┌─────────────┐ ┌─────────────┐      │
│  │  [  🍔  ]   │ │  [  🍕  ]   │      │
│  │  Big Burger │ │  Pepperoni  │      │
│  │  ⭐ 4.8     │ │  ⭐ 4.9     │      │
│  │  Rs. 450    │ │  Rs. 850    │      │
│  └─────────────┘ └─────────────┘      │
│                                        │
├────────────────────────────────────────┤
│   🏠    🔍    🛒    ❤️    👤          │
└────────────────────────────────────────┘
```

---

## ✨ Features

### UI Components
- ✅ Animated Hero Section with parallax effect
- ✅ Category pills with horizontal scroll
- ✅ Restaurant cards with hover effects
- ✅ Food item cards with add to cart animation
- ✅ Bottom navigation with active indicator
- ✅ Search with live suggestions
- ✅ Filter & sort options modal
- ✅ Cart drawer with slide animation
- ✅ Order tracking timeline
- ✅ Rating & review system UI
- ✅ Dark/Light theme toggle
- ✅ Skeleton loading states
- ✅ Empty state illustrations
- ✅ Pull to refresh animation

### Screens
1. **Home Screen** - Hero, categories, featured restaurants
2. **Search Screen** - Search bar, filters, results grid
3. **Restaurant Detail** - Header, menu sections, reviews
4. **Food Detail** - Images gallery, options, add-ons
5. **Cart Screen** - Items list, promo code, checkout
6. **Checkout Screen** - Address, payment, order summary
7. **Order Tracking** - Map, timeline, driver info
8. **Profile Screen** - User info, orders history, settings
9. **Favorites Screen** - Saved restaurants & items

---

## 🎯 Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 14** | React framework with App Router |
| **TypeScript** | Type safety |
| **Tailwind CSS** | Utility-first styling |
| **Framer Motion** | Smooth animations |
| **Lucide Icons** | Beautiful icons |
| **Zustand** | State management |
| **React Hook Form** | Form handling |

---

## 📁 Project Structure

```
food-delivery-ui/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Home
│   ├── search/
│   │   └── page.tsx
│   ├── restaurant/
│   │   └── [id]/
│   │       └── page.tsx
│   ├── food/
│   │   └── [id]/
│   │       └── page.tsx
│   ├── cart/
│   │   └── page.tsx
│   ├── checkout/
│   │   └── page.tsx
│   ├── tracking/
│   │   └── [orderId]/
│   │       └── page.tsx
│   ├── profile/
│   │   └── page.tsx
│   └── favorites/
│       └── page.tsx
│
├── components/
│   ├── ui/                         # Base UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── Avatar.tsx
│   │   ├── Skeleton.tsx
│   │   ├── Modal.tsx
│   │   ├── Drawer.tsx
│   │   ├── Toast.tsx
│   │   └── index.ts
│   │
│   ├── layout/                     # Layout components
│   │   ├── Header.tsx
│   │   ├── BottomNav.tsx
│   │   ├── Sidebar.tsx
│   │   └── Container.tsx
│   │
│   ├── home/                       # Home page components
│   │   ├── HeroSection.tsx
│   │   ├── CategoryScroll.tsx
│   │   ├── FeaturedSection.tsx
│   │   ├── PopularItems.tsx
│   │   └── PromoCarousel.tsx
│   │
│   ├── restaurant/                 # Restaurant components
│   │   ├── RestaurantCard.tsx
│   │   ├── RestaurantHeader.tsx
│   │   ├── MenuSection.tsx
│   │   ├── ReviewCard.tsx
│   │   └── RestaurantInfo.tsx
│   │
│   ├── food/                       # Food item components
│   │   ├── FoodCard.tsx
│   │   ├── FoodDetail.tsx
│   │   ├── AddOnSelector.tsx
│   │   ├── QuantitySelector.tsx
│   │   └── ImageGallery.tsx
│   │
│   ├── cart/                       # Cart components
│   │   ├── CartItem.tsx
│   │   ├── CartSummary.tsx
│   │   ├── PromoCodeInput.tsx
│   │   └── CartDrawer.tsx
│   │
│   ├── checkout/                   # Checkout components
│   │   ├── AddressSelector.tsx
│   │   ├── PaymentMethod.tsx
│   │   ├── OrderSummary.tsx
│   │   └── PlaceOrderButton.tsx
│   │
│   └── tracking/                   # Order tracking
│       ├── TrackingMap.tsx
│       ├── OrderTimeline.tsx
│       ├── DriverCard.tsx
│       └── DeliveryStatus.tsx
│
├── hooks/                          # Custom hooks
│   ├── useCart.ts
│   ├── useTheme.ts
│   ├── useDebounce.ts
│   └── useIntersectionObserver.ts
│
├── store/                          # Zustand stores
│   ├── cartStore.ts
│   ├── userStore.ts
│   └── filterStore.ts
│
├── lib/                            # Utilities
│   ├── utils.ts
│   ├── constants.ts
│   └── animations.ts
│
├── styles/
│   └── globals.css
│
├── public/
│   ├── images/
│   └── icons/
│
└── types/
    └── index.ts
```

---

## 🎨 Design System

### Color Palette

```css
/* Primary Colors */
--primary: #FF6B35;          /* Orange - Main brand color */
--primary-light: #FF8F66;
--primary-dark: #E85A2A;

/* Secondary Colors */
--secondary: #2EC4B6;        /* Teal - Accent */
--success: #22C55E;          /* Green - Success states */
--warning: #F59E0B;          /* Amber - Warnings */
--error: #EF4444;            /* Red - Errors */

/* Neutral Colors */
--background: #FAFAFA;
--surface: #FFFFFF;
--text-primary: #1F2937;
--text-secondary: #6B7280;
--text-muted: #9CA3AF;
--border: #E5E7EB;

/* Dark Theme */
--dark-background: #0F0F0F;
--dark-surface: #1A1A1A;
--dark-text-primary: #FAFAFA;
--dark-text-secondary: #A1A1AA;
--dark-border: #27272A;
```

### Typography

```css
/* Font Family */
--font-display: 'Plus Jakarta Sans', sans-serif;
--font-body: 'Inter', sans-serif;

/* Font Sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
```

### Spacing Scale

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
```

---

## 🧩 Key Components

### 1. Food Card Component

```tsx
// components/food/FoodCard.tsx

'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Heart, Plus, Star } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '@/hooks/useCart';

interface FoodCardProps {
  id: string;
  name: string;
  image: string;
  price: number;
  rating: number;
  restaurant: string;
  isFavorite?: boolean;
}

export function FoodCard({
  id,
  name,
  image,
  price,
  rating,
  restaurant,
  isFavorite = false,
}: FoodCardProps) {
  const [liked, setLiked] = useState(isFavorite);
  const [isAdding, setIsAdding] = useState(false);
  const { addItem } = useCart();

  const handleAddToCart = async () => {
    setIsAdding(true);
    await addItem({ id, name, price, image, quantity: 1 });
    setTimeout(() => setIsAdding(false), 500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="group relative bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden">
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-500"
        />

        {/* Favorite Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setLiked(!liked)}
          className="absolute top-3 right-3 w-8 h-8 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              liked ? 'fill-red-500 text-red-500' : 'text-gray-400'
            }`}
          />
        </motion.button>

        {/* Rating Badge */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-full">
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
          <span className="text-xs font-semibold">{rating}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
          {restaurant}
        </p>
        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
          {name}
        </h3>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-primary">
              Rs. {price}
            </span>
          </div>

          {/* Add to Cart Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleAddToCart}
            disabled={isAdding}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              isAdding
                ? 'bg-green-500 text-white'
                : 'bg-primary/10 text-primary hover:bg-primary hover:text-white'
            }`}
          >
            {isAdding ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-sm"
              >
                ✓
              </motion.div>
            ) : (
              <Plus className="w-5 h-5" />
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
```

### 2. Category Scroll Component

```tsx
// components/home/CategoryScroll.tsx

'use client';

import { motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const categories = [
  { id: 1, name: 'Burger', emoji: '🍔', color: 'bg-orange-100' },
  { id: 2, name: 'Pizza', emoji: '🍕', color: 'bg-red-100' },
  { id: 3, name: 'Asian', emoji: '🍜', color: 'bg-yellow-100' },
  { id: 4, name: 'Dessert', emoji: '🍰', color: 'bg-pink-100' },
  { id: 5, name: 'Drinks', emoji: '🥤', color: 'bg-blue-100' },
  { id: 6, name: 'Biryani', emoji: '🍛', color: 'bg-amber-100' },
  { id: 7, name: 'BBQ', emoji: '🍖', color: 'bg-red-100' },
  { id: 8, name: 'Healthy', emoji: '🥗', color: 'bg-green-100' },
];

export function CategoryScroll() {
  const [activeId, setActiveId] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative">
      {/* Scroll Buttons */}
      <button
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white dark:bg-zinc-800 shadow-lg rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white dark:bg-zinc-800 shadow-lg rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Categories */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 px-1"
      >
        {categories.map((category, index) => (
          <motion.button
            key={category.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => setActiveId(category.id)}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl min-w-[80px] transition-all ${
              activeId === category.id
                ? 'bg-primary text-white shadow-lg shadow-primary/30'
                : `${category.color} dark:bg-zinc-800`
            }`}
          >
            <span className="text-2xl">{category.emoji}</span>
            <span className="text-xs font-medium whitespace-nowrap">
              {category.name}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
```

### 3. Cart Drawer Component

```tsx
// components/cart/CartDrawer.tsx

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useCart } from '@/hooks/useCart';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, total, updateQuantity, removeItem } = useCart();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-zinc-900 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b dark:border-zinc-800">
              <h2 className="text-xl font-bold">Your Cart</h2>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {items.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🛒</div>
                  <p className="text-gray-500">Your cart is empty</p>
                </div>
              ) : (
                items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex gap-4 p-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl"
                  >
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{item.name}</h3>
                      <p className="text-primary font-bold mt-1">
                        Rs. {item.price}
                      </p>

                      <div className="flex items-center justify-between mt-2">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-7 h-7 rounded-lg bg-white dark:bg-zinc-700 flex items-center justify-center shadow-sm"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-2 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-6 border-t dark:border-zinc-800 space-y-4">
                {/* Promo Code */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Promo code"
                    className="flex-1 px-4 py-3 bg-gray-100 dark:bg-zinc-800 rounded-xl text-sm"
                  />
                  <button className="px-4 py-3 bg-primary/10 text-primary font-medium rounded-xl">
                    Apply
                  </button>
                </div>

                {/* Summary */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal</span>
                    <span>Rs. {total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Delivery</span>
                    <span>Rs. 99</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t dark:border-zinc-700">
                    <span>Total</span>
                    <span className="text-primary">Rs. {total + 99}</span>
                  </div>
                </div>

                {/* Checkout Button */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 bg-primary text-white font-semibold rounded-2xl shadow-lg shadow-primary/30"
                >
                  Proceed to Checkout
                </motion.button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

---

## 🎬 Animations

### Page Transitions
```tsx
// lib/animations.ts

export const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 }
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05
    }
  }
};

export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 }
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 }
};

export const slideInRight = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 }
};
```

---

## 📦 Dependencies

```json
{
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "react-dom": "18.x",
    "typescript": "5.x",
    "tailwindcss": "3.x",
    "framer-motion": "^10.x",
    "lucide-react": "^0.300.x",
    "zustand": "^4.x",
    "react-hook-form": "^7.x",
    "clsx": "^2.x",
    "tailwind-merge": "^2.x"
  }
}
```

---

## 🚀 Getting Started

```bash
# Clone repository
git clone https://github.com/fahaddoc600/food-delivery-ui.git

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

---

## 📱 Responsive Breakpoints

| Breakpoint | Width | Target |
|------------|-------|--------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Large desktop |

---

## 🎯 Performance Optimizations

- ✅ Image optimization with Next.js Image
- ✅ Code splitting with dynamic imports
- ✅ Lazy loading components
- ✅ Optimized animations with Framer Motion
- ✅ Memoized components with React.memo
- ✅ Virtualized lists for large datasets

---

## 📸 Screenshots

> Add your app screenshots here

| Home | Restaurant | Cart | Checkout |
|------|------------|------|----------|
| Screenshot 1 | Screenshot 2 | Screenshot 3 | Screenshot 4 |

---

## 👨‍💻 Author

**Shah Fahad**
- GitHub: [@fahaddoc600](https://github.com/fahaddoc600)
- LinkedIn: [fahaddoc600](https://linkedin.com/in/fahaddoc600)
- Email: fahaddoc600@gmail.com

---

## 📝 Notes

This is a **UI-only clone** for portfolio and learning purposes. The backend integration will be handled separately.

### Future Backend Integration Points:
- User authentication (Firebase/Custom)
- Restaurant data API
- Order management
- Real-time order tracking
- Payment gateway integration
- Push notifications

---

## 📄 License

This project is for educational and portfolio purposes.
