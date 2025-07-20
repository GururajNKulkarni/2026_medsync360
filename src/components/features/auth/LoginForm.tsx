import React from 'react';
import { useState, useEffect } from 'react';
import { Mail, Loader2, Lock, Eye, EyeOff, LogIn, Shield, Stethoscope, FileText, Brain, MessageCircle, Calendar, CheckCircle, ArrowRight, Moon, Sun, Sparkles, Zap, ClipboardCheck, X, Heart, Activity } from 'lucide-react';
import { Video } from 'lucide-react';
import { supabase, checkSupabaseConnection, signInWithGoogle } from '../../../lib/supabase';
import { checkTestAccounts } from '../../../lib/checkAccounts';
import medicalBg from '../assets/medical-bg.jpg';
import type { AuthError } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';

interface LoginFormProps {
  authError: string | null;
}

export default function LoginForm({ authError = null }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(authError || null);
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot-password'>('login');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [lastSignUpEmail, setLastSignUpEmail] = useState<string>('');
  const [forgotPasswordCooldown, setForgotPasswordCooldown] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(60);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string>('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [showFullContent, setShowFullContent] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    // Check if user has a preference stored
    const savedPreference = localStorage.getItem('darkMode');
    // Check system preference if no saved preference
    if (savedPreference === null) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return savedPreference === 'true';
  });
  const [activeFeature, setActiveFeature] = useState(0);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  // Features for animation
  const features = [
    {
      title: "AI-Powered Documentation",
      description: "Save 50%+ time with intelligent transcription and clinical insights",
      icon: <Brain className="w-6 h-6" />,
      color: "from-purple-600 to-indigo-600"
    },
    {
      title: "Secure Messaging",
      description: "End-to-end encrypted communication with HIPAA compliance",
      icon: <Shield className="w-6 h-6" />,
      color: "from-blue-600 to-cyan-600"
    },
    {
      title: "Smart Referrals",
      description: "Streamline patient referrals with real-time tracking",
      icon: <FileText className="w-6 h-6" />,
      color: "from-green-600 to-emerald-600"
    },
    {
      title: "Duty Management",
      description: "Intelligent shift management with department-wide visibility",
      icon: <Calendar className="w-6 h-6" />,
      color: "from-orange-600 to-amber-600"
    }
  ];

  // Cycle through features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Apply dark mode class to body
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Save preference
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  // FIXED: Password reset URL detection with proper error handling
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const type = hashParams.get('type');
    const error = hashParams.get('error');
    const errorDescription = hashParams.get('error_description');
    const accessToken = hashParams.get('access_token');
    
    if (error === 'access_denied' && errorDescription) {
      // Handle expired/invalid reset links
      const message = decodeURIComponent(errorDescription.replace(/\+/g, ' '));
      setError(message);
      setMode('forgot-password'); // Let user request new link
      window.history.replaceState({}, '', window.location.pathname);
    } else if (type === 'recovery' && accessToken) {
      // Valid reset link with access token
      setIsResetMode(true);
      setMode('forgot-password');
      // Don't clean URL yet - Supabase needs the tokens
    } else if (type === 'email_verification') {
      setSuccessMessage('Email verified successfully! You can now sign in.');
      window.location.hash = '';
    }
  }, []);

  useEffect(() => {
    let interval: number;
    if (forgotPasswordCooldown && cooldownSeconds > 0) {
      interval = window.setInterval(() => {
        setCooldownSeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [forgotPasswordCooldown, cooldownSeconds]);

  const getErrorMessage = (error: AuthError) => {
    switch (error.message) {
      case 'Invalid login credentials':
        return 'The email or password you entered is incorrect. Please try again.';
      case 'Email not confirmed':
        setUnconfirmedEmail(email);
        return 'Please verify your email address before signing in. Check your inbox and spam folder for the verification email.';
      case 'User not found':
        return 'No account found with this email. Please sign up first.';
      case 'invalid_credentials':
        return 'The email or password you entered is incorrect. Please try again.';
      default:
        return error.message || 'An error occurred. Please try again.';
    }
  };

  const validateForm = () => {
    if (!email || !password) {
      setError('Please enter both email and password.');
      return false;
    }
    
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return false;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return false;
    }

    return true;
  };

  const validatePasswordReset = () => {
    if (!newPassword || !confirmPassword) {
      setError('Please enter and confirm your new password.');
      return false;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return false;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }

    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUnconfirmedEmail('');

    // Check connection before attempting login
    const isConnected = await checkSupabaseConnection();
    if (!isConnected) {
      setError('Unable to connect to the server. Please try again later.');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        // Handle specific error cases
        if (error.message === 'Invalid login credentials') {
          setError('The email or password you entered is incorrect. Please check your credentials and try again.');
        } else if (error.message === 'Email not confirmed') {
          setUnconfirmedEmail(email);
          setError('Please verify your email address before signing in. Check your inbox and spam folder for the verification email.');
        } else if (error.message.includes('Database error') || error.message.includes('connection')) {
          setError('Server connection error. Please try again in a moment.');
        } else {
          setError(error.message || 'An error occurred during sign in. Please try again.');
        }
        return;
      }

      // Successful login - auth store will handle profile loading
      setError(null);
      console.log('Sign in successful for:', email);
      
    } catch (error) {
      console.error('Error:', error);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async (emailToVerify?: string) => {
    const verificationEmail = emailToVerify || lastSignUpEmail || unconfirmedEmail;
    if (!verificationEmail) return;
    
    setResendingEmail(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: verificationEmail,
        options: {
          emailRedirectTo: new URL(window.location.href).toString()
        }
      });

      if (error) throw error;
      setSuccessMessage(`Verification email resent to ${verificationEmail}. Please check your inbox and spam folder.`);
      setError(null);
    } catch (error) {
      console.error('Error resending verification:', error);
      setError('Failed to resend verification email. Please try again.');
    } finally {
      setResendingEmail(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/#type=email_verification`
        }
      });

      if (error) {
        setError(getErrorMessage(error));
        return;
      }

      if (data?.user?.identities?.length === 0) {
        setError('This email is already registered. Please try signing in instead.');
        setMode('login');
        return;
      }

      setLastSignUpEmail(email);
      setVerificationSent(true);
      setSuccessMessage(`Verification email sent to ${email}. Please check your inbox and spam folder.`);
      setMode('login');
    } catch (error) {
      console.error('Error:', error);
      setError((error as AuthError).message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (isResetMode) {
      if (!validatePasswordReset()) return;
      
      setIsLoading(true);
      try {
        const { error } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (error) throw error;

        setSuccessMessage('Password updated successfully! You can now sign in with your new password.');
        setMode('login');
        setIsResetMode(false);
      } catch (error) {
        console.error('Error resetting password:', error);
        setError('Failed to reset password. Please try again.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (forgotPasswordCooldown) {
      setError(`Please wait ${cooldownSeconds} seconds before requesting another reset email.`);
      return;
    }

    setIsLoading(true);

    try {
      // FIXED: Simple redirectTo URL - let Supabase append its own parameters
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/`,
      });

      if (error) throw error;

      setSuccessMessage('Password reset instructions have been sent to your email.');
      setMode('login');
      
      // Start cooldown
      setForgotPasswordCooldown(true);
      setCooldownSeconds(60);
      setTimeout(() => {
        setForgotPasswordCooldown(false);
        setCooldownSeconds(60);
      }, 60000);
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to send password reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setGoogleError(null);
      setError(null);
      console.log('Starting Google sign-in process...');
      await signInWithGoogle();
      console.log('Google sign-in initiated, waiting for redirect...');
      // Redirect is handled by Supabase OAuth
    } catch (error) {
      console.error('Google sign in error:', error);
      setGoogleError(error instanceof Error ? error.message : 'Failed to sign in with Google');
      setGoogleLoading(false);
    }
  };

  const toggleContent = () => {
    setShowFullContent(!showFullContent);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };
  
  // Background style with the medical image
  const backgroundStyle = {
    backgroundImage: `linear-gradient(to right, ${darkMode ? 'rgba(17, 24, 39, 0.92)' : 'rgba(255, 255, 255, 0.92)'}, ${darkMode ? 'rgba(17, 24, 39, 0.85)' : 'rgba(255, 255, 255, 0.85)'}), url(https://images.pexels.com/photos/40568/medical-appointment-doctor-healthcare-40568.jpeg)`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed'
  };

  return (
    <div style={backgroundStyle} className="min-h-screen flex flex-col transition-all duration-500 overflow-x-hidden">
      {/* Header with logo */}
      <header className={`w-full ${darkMode ? 'bg-gray-900/90 backdrop-blur-md border-b border-gray-800' : 'bg-white/90 backdrop-blur-md border-b border-gray-200'} shadow-md py-4 px-6 flex items-center justify-between sticky top-0 z-10 transition-colors duration-300`}>
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300">
              <Activity className="w-5 h-5 text-white absolute" style={{ opacity: 0.7 }} />
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center text-[8px] text-white font-bold">
              360
            </div>
          </div>
          <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-blue-900'}`}>
            MedSync<span className="text-purple-500">360</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 text-yellow-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button 
            onClick={toggleContent}
            className={`text-sm font-medium ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} flex items-center gap-1 md:hidden transition-colors`}
          >
            {showFullContent ? 'Hide Features' : 'Show Features'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row flex-1 w-full">
        {/* Hero Section - Visually appealing with AI focus */}
        <div className={`${showFullContent ? 'block' : 'hidden'} md:block md:w-1/2 p-4 md:p-8 overflow-y-auto`}>
          <div className="max-w-xl mx-auto space-y-6 relative z-10">
            {/* Hero Section */}
            <div className={`${darkMode ? 'bg-gray-900/80 border-gray-700' : 'bg-white/95 border-blue-100'} backdrop-blur-md rounded-xl p-6 shadow-xl border transition-all duration-300 transform hover:scale-[1.01]`}>
              <div className="flex items-center justify-center mb-6 overflow-hidden rounded-lg shadow-lg relative">
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent z-10"></div>
                
                {/* Mind mapping video with fallback */}
                <div className="w-full h-64 relative">
                  <video 
                    className={`w-full h-full object-cover transition-opacity duration-700 ${isVideoLoaded ? 'opacity-100' : 'opacity-0'}`}
                    autoPlay 
                    muted 
                    loop 
                    playsInline
                    poster="https://images.pexels.com/photos/40568/medical-appointment-doctor-healthcare-40568.jpeg"
                    onLoadedData={() => setIsVideoLoaded(true)}
                  >
                    <source src="https://player.vimeo.com/progressive_redirect/playback/855066511/rendition/720p/file.mp4?loc=external&oauth2_token_id=57447761&signature=c9b9a0f4a7a3a2e2f8a9e8e7f6d5c4b3a2e1f0d9c8b7a6f5e4d3c2b1a0" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                  
                  {/* Fallback image while video loads */}
                  <img 
                    src="https://images.pexels.com/photos/40568/medical-appointment-doctor-healthcare-40568.jpeg" 
                    alt="Medical professionals" 
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${isVideoLoaded ? 'opacity-0' : 'opacity-100'}`}
                  />
                  
                  <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                    <div className="flex items-center gap-2 mb-1">
                      <Brain className="w-5 h-5 text-blue-300" />
                      <span className="text-sm font-medium text-white">AI-Powered Healthcare</span>
                    </div>
                    <h2 className="text-white text-xl font-bold">Transforming Medical Communication</h2>
                  </div>
                </div>
              </div>
              
              <h2 className={`text-2xl md:text-3xl font-bold text-center ${darkMode ? 'text-white' : 'text-gray-900'} mb-3 transition-colors bg-clip-text ${darkMode ? '' : 'text-transparent bg-gradient-to-r from-blue-600 to-purple-700'}`}>
                AI-Powered Healthcare Communication
              </h2>
              
              <p className={`text-center text-base md:text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-6 transition-colors`}>
                Revolutionize your clinical workflow with intelligent documentation, secure messaging, and seamless collaboration.
              </p>
              
              <div className="flex justify-center">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700'} animate-pulse`}>
                  <Zap className="w-4 h-4" />
                  <span>Saves 50%+ documentation time</span>
                </div>
              </div>
            </div>
            
            {/* Animated Feature Showcase */}
            <div className={`${darkMode ? 'bg-gray-900/80 border-gray-700' : 'bg-white/95 border-blue-100'} backdrop-blur-md rounded-xl p-6 shadow-xl border transition-all duration-300`}>
              <div className="relative overflow-hidden h-[300px]">
                {features.map((feature, index) => (
                  <div 
                    key={index}
                    className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                      activeFeature === index 
                        ? 'opacity-100 translate-x-0' 
                        : 'opacity-0 translate-x-full'
                    }`}
                  >
                    <div className={`h-full rounded-xl bg-gradient-to-r ${feature.color} p-6 flex flex-col justify-between`}>
                      <div>
                        <div className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                          <div className="animate-pulse">{feature.icon}</div>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                        <p className="text-white/80">{feature.description}</p>
                      </div>
                      
                      <div className="mt-6 pt-6 border-t border-white/20">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-sm text-white">HIPAA Compliant</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Feature navigation dots */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                  {features.map((_, index) => (
                    <button 
                      key={index}
                      onClick={() => setActiveFeature(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        activeFeature === index 
                          ? 'bg-white w-6' 
                          : 'bg-white/50 hover:bg-white/80'
                      }`}
                      aria-label={`View feature ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            {/* Key Benefits in Visual Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`${darkMode ? 'bg-gray-900/80 border-gray-700 hover:bg-gray-800/90' : 'bg-white/95 border-blue-100 hover:shadow-lg'} rounded-lg p-4 shadow-md border transition-all duration-300 transform hover:scale-[1.02]`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`p-2 ${darkMode ? 'bg-blue-900/50' : 'bg-blue-100'} rounded-lg`}>
                    <Shield className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Secure Communication</h3>
                </div>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
                  End-to-end encrypted messaging with HIPAA compliance and audit logging.
                </p>
              </div>
              
              <div className={`${darkMode ? 'bg-gray-900/80 border-gray-700 hover:bg-gray-800/90' : 'bg-white/95 border-blue-100 hover:shadow-lg'} rounded-lg p-4 shadow-md border transition-all duration-300 transform hover:scale-[1.02]`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`p-2 ${darkMode ? 'bg-green-900/50' : 'bg-green-100'} rounded-lg`}>
                    <MessageCircle className={`w-5 h-5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                  </div>
                  <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Streamlined Referrals</h3>
                </div>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
                  Cross-department referrals with urgency tracking and real-time updates.
                </p>
              </div>
              
              <div className={`${darkMode ? 'bg-gray-900/80 border-gray-700 hover:bg-gray-800/90' : 'bg-white/95 border-blue-100 hover:shadow-lg'} rounded-lg p-4 shadow-md border transition-all duration-300 transform hover:scale-[1.02]`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`p-2 ${darkMode ? 'bg-orange-900/50' : 'bg-orange-100'} rounded-lg`}>
                    <Calendar className={`w-5 h-5 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                  </div>
                  <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Smart Duty Roster</h3>
                </div>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
                  Intelligent shift management with department-wide visibility and swap features.
                </p>
              </div>
              
              <div className={`${darkMode ? 'bg-gray-900/80 border-gray-700 hover:bg-gray-800/90' : 'bg-white/95 border-blue-100 hover:shadow-lg'} rounded-lg p-4 shadow-md border transition-all duration-300 transform hover:scale-[1.02]`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`p-2 ${darkMode ? 'bg-purple-900/50' : 'bg-purple-100'} rounded-lg`}>
                    <Brain className={`w-5 h-5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                  </div>
                  <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>AI Documentation</h3>
                </div>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
                  Automated clinical documentation with structured data and medical coding.
                </p>
              </div>
            </div>
            
            {/* Testimonial Section */}
            <div className={`${darkMode ? 'bg-gray-900/80 border-gray-700' : 'bg-white/95 border-blue-100'} rounded-xl p-6 shadow-xl border transition-all duration-300`}>
              <div className="flex justify-center mb-4">
                <div className="px-4 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-green-600 to-teal-600 text-white flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  <span>TESTIMONIALS</span>
                </div>
              </div>
              
              <div className="relative">
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800/90' : 'bg-gray-50/95'} backdrop-blur-sm`}>
                  <p className={`italic text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
                    "MedSync360 has transformed our department's workflow. The AI transcription saves me hours each week on documentation, and the secure messaging has improved our team's coordination dramatically."
                  </p>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold`}>
                      DR
                    </div>
                    <div>
                      <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Dr. Rajesh Kumar</p>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Senior Cardiologist, KIMS Bangalore</p>
                    </div>
                  </div>
                </div>
                
                <div className="absolute -bottom-2 -right-2 transform rotate-6">
                  <div className={`w-6 h-6 rounded-full ${darkMode ? 'bg-blue-900/50' : 'bg-blue-100'} flex items-center justify-center`}>
                    <CheckCircle className={`w-3 h-3 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Contact Section */}
            <div className={`${darkMode ? 'bg-gradient-to-r from-blue-900/90 to-indigo-900/90' : 'bg-gradient-to-r from-blue-600/90 to-indigo-700/90'} backdrop-blur-md text-white p-6 rounded-xl shadow-xl transition-colors transform hover:scale-[1.01]`}>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <div className="relative">
                  <Heart className="w-5 h-5 text-red-400" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                Ready to Transform Your Practice?
              </h3>
              <p className={`${darkMode ? 'text-blue-200' : 'text-blue-100'} text-sm mb-4 transition-colors`}>
                Join thousands of healthcare professionals already using MedSync360 to streamline their workflow.
              </p>
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-full ${darkMode ? 'bg-white/10' : 'bg-white/20'}`}>
                  <Stethoscope className="w-4 h-4 text-white" />
                </div>
                <p className={`${darkMode ? 'text-blue-200' : 'text-blue-100'} text-sm transition-colors`}>
                  Call or WhatsApp: <a href="tel:9606736966" className="text-white font-medium hover:underline">96067 36966</a>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Login Form Section */}
        <div className={`${showFullContent ? 'hidden' : 'block'} md:block md:w-1/2 p-4 md:p-8 flex items-center justify-center relative`}>
          {/* Decorative elements */}
          <div className="absolute top-20 left-10 w-20 h-20 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
          
          <div className="w-full max-w-md">
            <div className={`${darkMode ? 'bg-gray-900/90 border-gray-700' : 'bg-white/95 border-gray-200'} backdrop-blur-md rounded-2xl shadow-2xl p-8 border transition-all duration-300 transform hover:translate-y-[-5px]`}>
              {/* Form Header */}
              <div className="text-center mb-8">
                <div className="flex items-center justify-center mb-4">
                  <div className={`p-3 rounded-full ${darkMode ? 'bg-gradient-to-br from-blue-900 to-indigo-900' : 'bg-gradient-to-br from-blue-500 to-indigo-600'} animate-pulse shadow-lg`}>
                    <LogIn className={`w-8 h-8 text-white`} />
                  </div>
                </div>
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                  {mode === 'login' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
                </h2>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {mode === 'login' ? 'Sign in to your MedSync360 account' : 
                   mode === 'signup' ? 'Join the future of healthcare communication' : 
                   isResetMode ? 'Enter your new password' : 'Enter your email to reset password'}
                </p>
              </div>

              {/* Error Messages */}
              {error && (
                <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'} border flex items-start gap-3 animate-in slide-in-from-top-2`}>
                  <X className={`w-5 h-5 ${darkMode ? 'text-red-400' : 'text-red-500'} mt-0.5 flex-shrink-0`} />
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-700'} font-medium`}>
                      {error}
                    </p>
                    {unconfirmedEmail && (
                      <button
                        onClick={() => handleResendVerification(unconfirmedEmail)}
                        disabled={resendingEmail}
                        className={`mt-2 text-xs ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} underline disabled:opacity-50`}
                      >
                        {resendingEmail ? 'Sending...' : 'Resend verification email'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Success Messages */}
              {successMessage && (
                <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'} border flex items-start gap-3 animate-in slide-in-from-top-2`}>
                  <CheckCircle className={`w-5 h-5 ${darkMode ? 'text-green-400' : 'text-green-500'} mt-0.5 flex-shrink-0`} />
                  <p className={`text-sm ${darkMode ? 'text-green-300' : 'text-green-700'} font-medium`}>
                    {successMessage}
                  </p>
                </div>
              )}

              {/* Google Sign In */}
              {mode === 'login' && (
                <div className="mb-6">
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading}
                    className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border shadow-md ${
                      darkMode 
                        ? 'border-gray-600 bg-gray-700 hover:bg-gray-600 text-white' 
                        : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-700'
                    } font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.01] active:scale-[0.99]`}
                  >
                    {googleLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    )}
                    {googleLoading ? 'Signing in...' : 'Continue with Google'}
                  </button>
                  
                  {googleError && (
                    <p className={`mt-2 text-sm ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                      {googleError}
                    </p>
                  )}
                  
                  <div className="relative my-6">
                    <div className={`absolute inset-0 flex items-center`}>
                      <div className={`w-full border-t ${darkMode ? 'border-gray-600' : 'border-gray-300'}`} />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className={`px-2 ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'}`}>
                        Or continue with email
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={mode === 'login' ? handleLogin : mode === 'signup' ? handleSignUp : handleForgotPassword} className="space-y-6">
                {/* Email Field */}
                {!isResetMode && (
                  <div>
                    <label htmlFor="email" className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                          darkMode 
                            ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-blue-500' 
                            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500'
                        } focus:ring-2 focus:ring-blue-500/20 transition-colors`}
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Password Fields */}
                {mode !== 'forgot-password' || isResetMode ? (
                  <div>
                    <label htmlFor="password" className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      {isResetMode ? 'New Password' : 'Password'}
                    </label>
                    <div className="relative">
                      <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={isResetMode ? newPassword : password}
                        onChange={(e) => isResetMode ? setNewPassword(e.target.value) : setPassword(e.target.value)}
                        className={`w-full pl-10 pr-12 py-3 rounded-lg border ${
                          darkMode 
                            ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-blue-500' 
                            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500'
                        } focus:ring-2 focus:ring-blue-500/20 transition-colors`}
                        placeholder={isResetMode ? 'Enter new password' : 'Enter your password'}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'} transition-colors`}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Confirm Password for Reset */}
                {isResetMode && (
                  <div>
                    <label htmlFor="confirmPassword" className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                      <input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                          darkMode 
                            ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-blue-500' 
                            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500'
                        } focus:ring-2 focus:ring-blue-500/20 transition-colors`}
                        placeholder="Confirm new password"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all shadow-lg relative overflow-hidden group ${
                    darkMode
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white disabled:opacity-50'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white disabled:opacity-50'
                  } disabled:cursor-not-allowed transform hover:scale-[1.01] active:scale-[0.99] hover:shadow-xl`}
                >
                  {/* Animated background effect */}
                  <span className="absolute top-0 left-0 w-full h-full bg-white/10 transform -skew-x-12 -translate-x-full group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out"></span>
                  
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <LogIn className="w-5 h-5" />
                  )}
                  {isLoading ? 'Please wait...' : 
                   mode === 'login' ? 'Sign In' : 
                   mode === 'signup' ? 'Create Account' : 
                   isResetMode ? 'Update Password' : 'Send Reset Email'}
                </button>
              </form>

              {/* Form Footer */}
              <div className="mt-6 text-center space-y-3">
                {mode === 'login' && (
                  <>
                    <button
                      onClick={() => setMode('forgot-password')}
                      className={`text-sm ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} transition-colors`}
                    >
                      Forgot your password?
                    </button>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Don't have an account?{' '}
                      <button
                        onClick={() => setMode('signup')}
                        className={`${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} font-medium transition-colors`}
                      >
                        Sign up
                      </button>
                    </div>
                  </>
                )}

                {mode === 'signup' && (
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Already have an account?{' '}
                    <button
                      onClick={() => setMode('login')}
                      className={`${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} font-medium transition-colors`}
                    >
                      Sign in
                    </button>
                  </div>
                )}

                {mode === 'forgot-password' && !isResetMode && (
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Remember your password?{' '}
                    <button
                      onClick={() => setMode('login')}
                      className={`${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} font-medium transition-colors`}
                    >
                      Sign in
                    </button>
                  </div>
                )}
              </div>

              {/* Verification Resend */}
              {verificationSent && lastSignUpEmail && (
                <div className="mt-6 text-center">
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                    Didn't receive the email?
                  </p>
                  <button
                    onClick={() => handleResendVerification(lastSignUpEmail)}
                    disabled={resendingEmail}
                    className={`text-sm ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} underline disabled:opacity-50 transition-colors`}
                  >
                    {resendingEmail ? 'Sending...' : 'Resend verification email'}
                  </button>
                </div>
              )}
            </div>
            
            {/* Mobile CTA */}
            <div className="md:hidden mt-6 text-center">
              <div className="animate-bounce hover:animate-none">
                <button
                  onClick={toggleContent}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full shadow-lg ${
                    darkMode 
                      ? 'bg-gray-900/80 text-blue-400 border border-gray-700 shadow-lg backdrop-blur-sm' 
                      : 'bg-white/90 text-blue-600 border border-gray-200 shadow-lg backdrop-blur-sm'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  {showFullContent ? 'Hide Features' : 'Explore Features'}
                </button>
              </div>
            </div>
          </div>
          
          {/* Watch Video Button */}
          <div className="mt-6 text-center">
            <div className="flex flex-col items-center">
              <Link
                to="/medsync360_final"
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-medium transition-all duration-300 transform hover:scale-105 ${
                  darkMode 
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg' 
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg'
                }`}
              >
                <Video className="w-5 h-5" />
                Watch Video
              </Link>
              <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                From Excel to AI: The MedSync360 Journey
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className={`py-4 px-6 text-center text-sm ${darkMode ? 'text-gray-400 bg-gray-900/80 border-t border-gray-800' : 'text-gray-600 bg-white/80 border-t border-gray-200'} backdrop-blur-sm`}>
        <p>© 2025 MedSync360. All rights reserved. <span className="hidden md:inline">|</span><br className="md:hidden" /> Secure Healthcare Communication Platform</p>
      </footer>
    </div>
  );
}

export { LoginForm }