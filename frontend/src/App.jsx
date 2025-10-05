import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, ShoppingCart, ChevronLeft, ChevronRight, Trash2, Star, Clock, Sparkles, Volume2, Check, X } from 'lucide-react';

const BACKEND_WS_URL = 'ws://localhost:8000/ws/voice';

const VoiceOrderingSystem = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cart, setCart] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [showCartAnimation, setShowCartAnimation] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  const wsRef = useRef(null);

  // Enhanced menu items with more details
  const MENU_DATA = {
    caesar_salad: { 
      name: "Caesar Salad", 
      price: 8.99, 
      image: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=500&h=500&fit=crop",
      rating: 4.5,
      time: "10 min",
      calories: 320,
      badge: "Healthy",
      description: "Fresh romaine lettuce with parmesan and croutons"
    },
    cheeseburger: { 
      name: "Cheeseburger", 
      price: 12.99, 
      image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&h=500&fit=crop",
      rating: 4.8,
      time: "15 min",
      calories: 650,
      badge: "Bestseller",
      description: "Juicy beef patty with melted cheese and fresh vegetables"
    },
    chicken_nuggets: { 
      name: "Chicken Nuggets", 
      price: 7.99, 
      image: "https://images.unsplash.com/photo-1562967914-608f82629710?w=500&h=500&fit=crop",
      rating: 4.6,
      time: "12 min",
      calories: 480,
      badge: "Kids Favorite",
      description: "Crispy golden nuggets served with dipping sauce"
    },
    french_fries: { 
      name: "French Fries", 
      price: 4.99, 
      image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&h=500&fit=crop",
      rating: 4.7,
      time: "8 min",
      calories: 380,
      badge: "Popular",
      description: "Golden crispy fries with sea salt"
    },
    fried_chicken_wings: { 
      name: "Fried Chicken Wings", 
      price: 11.99, 
      image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&h=500&fit=crop",
      rating: 4.9,
      time: "18 min",
      calories: 580,
      badge: "Spicy",
      description: "Crispy wings tossed in our signature sauce"
    },
    hot_dog: { 
      name: "Hot Dog", 
      price: 6.99, 
      image: "https://images.unsplash.com/photo-1612392166886-ee8475b03af2?w=500&h=500&fit=crop",
      rating: 4.4,
      time: "5 min",
      calories: 420,
      badge: "Quick Bite",
      description: "Classic hot dog with mustard and ketchup"
    },
    soft_drink: { 
      name: "Soft Drink", 
      price: 2.99, 
      image: "https://images.unsplash.com/photo-1581006852262-e4307cf6283a?w=500&h=500&fit=crop",
      rating: 4.3,
      time: "1 min",
      calories: 150,
      badge: "Refreshing",
      description: "Ice-cold beverages to complement your meal"
    },
    veggie_burger: { 
      name: "Veggie Burger", 
      price: 10.99, 
      image: "https://images.unsplash.com/photo-1520072959219-c595dc870360?w=500&h=500&fit=crop",
      rating: 4.6,
      time: "14 min",
      calories: 390,
      badge: "Vegetarian",
      description: "Plant-based patty with fresh organic vegetables"
    }
  };

  // Initialize menu + WebSocket
  useEffect(() => {
    const items = Object.entries(MENU_DATA).map(([key, value]) => ({ key, ...value }));
    setMenuItems(items);
    connectWebSocket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Connect WebSocket
  const connectWebSocket = () => {
    wsRef.current = new WebSocket(BACKEND_WS_URL);

    wsRef.current.onopen = () => {
      setConnectionStatus('connected');
      console.log('✅ WebSocket connected');
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'carousel_update':
          if (data.data?.index !== undefined) {
            console.log("🔄 Carousel update:", data.data.index);
            setCurrentIndex(data.data.index);
          }
          break;
        case 'cart_update':
          if (data.data?.cart) {
            console.log("🛒 Cart update received:", data.data.cart);
            setCart(data.data.cart);
          }
          break;
        case 'response.text.delta':
          if (data.delta) {
            setAiResponse(prev => prev + data.delta);
          }
          break;
        case 'response.text.done':
          setTimeout(() => setAiResponse(''), 3000);
          break;
        default:
          break;
      }
    };

    wsRef.current.onerror = (err) => {
      console.error('❌ WebSocket error:', err);
      setConnectionStatus('error');
    };

    wsRef.current.onclose = () => {
      setConnectionStatus('disconnected');
      console.warn('⚪ WebSocket closed');
    };
  };

  // Frontend-only speech recognition
  const startSpeechRecognition = () => {
    if (isRecording) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showNotificationMessage("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "text", text }));
      }
    };
    recognition.onerror = (e) => console.error("⚠️ Speech recognition error:", e.error);
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  // Show notification
  const showNotificationMessage = (message) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  // Local carousel navigation
  const navigateCarousel = (direction) => {
    setCurrentIndex(prev => (direction === 'next' ? prev + 1 : prev - 1 + menuItems.length) % menuItems.length);
  };

  // Add & remove items with animations
  const addToCart = (item) => {
    setCart(prev => [...prev, item]);
    setShowCartAnimation(true);
    showNotificationMessage(`${item.name} added to cart!`);
    setTimeout(() => setShowCartAnimation(false), 600);
  };

  const removeFromCart = (i) => {
    const removedItem = cart[i];
    setCart(prev => prev.filter((_, idx) => idx !== i));
    showNotificationMessage(`${removedItem.name} removed from cart`);
  };

  const total = cart.reduce((sum, item) => sum + item.price, 0).toFixed(2);
  const currentItem = menuItems[currentIndex];

  // Badge color helper
  const getBadgeColor = (badge) => {
    const colors = {
      'Bestseller': 'bg-gradient-to-r from-yellow-400 to-orange-500',
      'Healthy': 'bg-gradient-to-r from-green-400 to-emerald-500',
      'Popular': 'bg-gradient-to-r from-blue-400 to-indigo-500',
      'Spicy': 'bg-gradient-to-r from-red-500 to-pink-500',
      'Vegetarian': 'bg-gradient-to-r from-green-500 to-teal-500',
      'Kids Favorite': 'bg-gradient-to-r from-purple-400 to-pink-500',
      'Quick Bite': 'bg-gradient-to-r from-cyan-400 to-blue-500',
      'Refreshing': 'bg-gradient-to-r from-blue-400 to-cyan-500'
    };
    return colors[badge] || 'bg-gray-500';
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background */}
      <div className="fixed inset-0 opacity-30">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-yellow-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-4000"></div>
      </div>

      {/* Notification */}
      {showNotification && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-white/95 backdrop-blur-lg px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
            <Check className="text-green-500" size={20} />
            <span className="font-semibold text-gray-800">{notificationMessage}</span>
          </div>
        </div>
      )}

      <div className="relative container mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 p-8">
        
        {/* Left Column: Menu & Voice Control */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header */}
          <div className="text-left">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="text-yellow-400 animate-pulse" size={32} />
              <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 animate-gradient">
                Gourmet Express
              </h1>
            </div>
            <p className="text-xl text-gray-300 mt-1 flex items-center gap-2">
              Order with your voice <Volume2 className="text-blue-400" size={20} />
            </p>
          </div>

          {/* Carousel */}
          <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg p-8 rounded-3xl border border-white/20 shadow-2xl">
            {currentItem && (
              <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
                {/* Carousel Image */}
                <div className="relative flex-shrink-0 group">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl blur-2xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  <img
                    src={currentItem.image}
                    alt={currentItem.name}
                    className="relative w-72 h-72 lg:w-80 lg:h-80 object-cover rounded-3xl shadow-2xl transform group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Badge */}
                  <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-white text-sm font-bold shadow-lg ${getBadgeColor(currentItem.badge)}`}>
                    {currentItem.badge}
                  </div>

                  {/* Navigation buttons */}
                  <button
                    onClick={() => navigateCarousel('prev')}
                    className="absolute top-1/2 -left-6 -translate-y-1/2 bg-white/90 backdrop-blur-lg p-3 rounded-full shadow-xl hover:bg-white hover:scale-110 transition-all duration-200"
                  >
                    <ChevronLeft size={24} className="text-gray-800" />
                  </button>
                  <button
                    onClick={() => navigateCarousel('next')}
                    className="absolute top-1/2 -right-6 -translate-y-1/2 bg-white/90 backdrop-blur-lg p-3 rounded-full shadow-xl hover:bg-white hover:scale-110 transition-all duration-200"
                  >
                    <ChevronRight size={24} className="text-gray-800" />
                  </button>
                </div>

                {/* Carousel Details */}
                <div className="text-center lg:text-left space-y-4">
                  <h2 className="text-4xl font-black text-white">{currentItem.name}</h2>
                  <p className="text-gray-300 text-lg">{currentItem.description}</p>
                  
                  {/* Stats */}
                  <div className="flex gap-4 justify-center lg:justify-start">
                    <div className="flex items-center gap-1">
                      <Star className="text-yellow-400 fill-yellow-400" size={20} />
                      <span className="text-white font-semibold">{currentItem.rating}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="text-blue-400" size={20} />
                      <span className="text-white font-semibold">{currentItem.time}</span>
                    </div>
                    <div className="text-white font-semibold">
                      {currentItem.calories} cal
                    </div>
                  </div>

                  <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                    ${currentItem.price.toFixed(2)}
                  </div>
                  
                  <button
                    onClick={() => addToCart(currentItem)}
                    className="w-full lg:w-auto px-8 py-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-2xl font-bold text-lg hover:from-orange-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 shadow-2xl flex items-center justify-center gap-2"
                  >
                    <ShoppingCart size={20} />
                    Add to Cart
                  </button>
                </div>
              </div>
            )}

            {/* Carousel indicators */}
            <div className="flex justify-center gap-2 mt-6">
              {menuItems.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === currentIndex 
                      ? 'w-8 bg-gradient-to-r from-yellow-400 to-orange-500' 
                      : 'w-2 bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Voice Interaction Panel */}
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg p-6 rounded-3xl border border-white/20 shadow-2xl">
            <div className="flex items-center gap-6">
              <button
                onClick={startSpeechRecognition}
                className={`flex-shrink-0 w-24 h-24 rounded-full transition-all duration-300 flex items-center justify-center shadow-2xl transform hover:scale-110 ${
                  isRecording
                    ? 'bg-gradient-to-r from-red-500 to-pink-500 animate-pulse'
                    : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
                }`}
              >
                {isRecording ? <MicOff size={40} className="text-white" /> : <Mic size={40} className="text-white" />}
              </button>
              <div className="flex-1">
                <p className="font-bold text-xl text-white mb-1">
                  {isRecording ? '🎧 Listening...' : '🎤 Tap to speak your order'}
                </p>
                <p className="text-gray-300 min-h-[24px]">
                  {transcript || aiResponse || 'Try: "Show me the cheeseburger" or "Add fries to my order"'}
                </p>
              </div>
              
              {/* Connection status */}
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                }`}></div>
                <span className="text-xs text-white font-medium">
                  {connectionStatus === 'connected' ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Cart */}
        <div className={`bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-3xl border border-white/20 shadow-2xl p-8 flex flex-col h-fit sticky top-8 ${
          showCartAnimation ? 'animate-pulse' : ''
        }`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl">
              <ShoppingCart className="text-white" size={28} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white">Your Order</h2>
              <p className="text-gray-300 text-sm">{cart.length} items</p>
            </div>
          </div>

          {cart.length === 0 ? (
            <div className="flex-grow flex flex-col items-center justify-center text-center py-16">
              <div className="p-6 bg-white/5 rounded-full mb-4">
                <ShoppingCart size={48} className="text-gray-400"/>
              </div>
              <p className="font-bold text-white text-xl mb-2">Your cart is empty</p>
              <p className="text-gray-400">Add delicious items to get started!</p>
            </div>
          ) : (
            <div className="flex-grow space-y-3 max-h-[50vh] overflow-y-auto pr-2">
              {cart.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl hover:bg-white/10 transition-all duration-200">
                  <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-xl" />
                  <div className="flex-grow">
                    <p className="font-bold text-white">{item.name}</p>
                    <p className="text-orange-400 font-semibold">${item.price.toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => removeFromCart(idx)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded-xl transition-all duration-200"
                  >
                    <X size={20} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Cart Footer */}
          <div className="border-t border-white/20 mt-6 pt-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold text-gray-300">Total</span>
              <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                ${total}
              </span>
            </div>
            <button 
              className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-bold text-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={cart.length === 0}
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default VoiceOrderingSystem;
