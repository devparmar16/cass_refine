import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { FaHandshake } from 'react-icons/fa';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('Chair Person');

  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    console.log('Attempting login with:', { username, role });
    try {
      const result = await login(username, password, role);
      console.log('Login result:', result);
      console.log('Selected role:', role);
      if (result.success) {
        toast({
          title: 'Login Successful',
          description: 'Welcome to Club Management System!',
        });
        if (result.isProfileComplete) {
          // Normalize role for URL (remove spaces and underscores)
          const urlRole = (result.role || role || '').toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
          console.log('Redirecting to:', `/${urlRole}/dashboard`);
          navigate(`/${urlRole}/dashboard`);
        } else {
          navigate('/complete-profile');
        }
      } else {
        setError('Invalid username, password, or role');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-gradient-to-l from-slate-200 to-blue-600 font-poppins">
      <style>
        {`
          .login-select option {
            padding: 12px 24px 12px 32px !important;
            font-family: 'Poppins', sans-serif;
            font-size: 16px;
            font-weight: 300;
            color: black;
            background: white;
            border-bottom: 1px solid #f3f4f6;
            transition: all 0.2s ease;
          }
          
          .login-select option:hover {
            background: #eff6ff !important;
            color: #1e40af;
          }
          
          .login-select option:checked {
            background: #2563eb !important;
            color: white;
            font-weight: 500;
          }

          @keyframes bounce-rotate {
            0%, 20%, 53%, 80%, 100% {
              transform: translate3d(0, 0, 0) rotate(-35deg);
            }
            40%, 43% {
              transform: translate3d(0, -30px, 0) rotate(-35deg);
            }
            70% {
              transform: translate3d(0, -15px, 0) rotate(-35deg);
            }
            90% {
              transform: translate3d(0, -4px, 0) rotate(-35deg);
            }
          }
        `}
      </style>
      {/* Background half-circle - vertical separation */}
      <div 
        className="absolute"
        style={{
          width: '120vh',
          height: '120vh',
          left: '0',
          top: '-10vh',
          backgroundColor: '#1B55B9',
          border: '25px solid white',
          borderRadius: '0 50% 50% 0',
          transform: 'translateX(-30%)'
        }}
      />

      {/* Left side content - removed entrance animations for smoother experience */}
      <div className="absolute left-4 sm:left-8 md:left-14 top-16 sm:top-24 md:top-36 z-10">
        {/* Main Logo - removed entrance animation */}
        <div className="mb-6 sm:mb-8 md:mb-12">
          <h1 className="text-white font-poppins text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-medium tracking-wider leading-tight mb-2 hover:scale-105 transition-transform duration-300">
            E-CASS
          </h1>
          <p className="text-white/60 text-left font-poppins text-sm sm:text-lg md:text-xl font-medium tracking-wider hover:text-white/80 transition-colors duration-300">
            IEEE Student Chapter
          </p>
        </div>

        {/* Tagline - removed entrance animation */}
        <div className="mb-8 sm:mb-12 md:mb-16 max-w-xs sm:max-w-sm md:max-w-md">
          <h2 className="text-white font-poppins text-lg sm:text-xl md:text-2xl lg:text-4xl font-medium leading-tight hover:scale-105 transition-transform duration-300">
            Empowering Event Execution with Clarity and Collaboration
          </h2>
        </div>

                  {/* Decorative Icons with smooth animations - keeping these as they're great */}
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 hidden lg:block">
            {/* Calendar with Checkmark Icon - with bounce animation */}
            <div 
              className="absolute animate-bounce"
              style={{ 
                left: '0px', 
                top: '0px',
                animationDelay: '0.5s',
                animationDuration: '2s'
              }}
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 hover:scale-110 transition-all duration-300">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transform: 'rotate(-20deg)' }}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2"/>
                  <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2"/>
                  <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2"/>
                  <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2"/>
                  <path d="M9 14l2 2 4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {/* Team Icon - with pulse animation */}
          <div 
            className="absolute transform rotate-12 animate-pulse"
            style={{ 
              left: '100px', 
              top: '60px',
              animationDelay: '1s',
              animationDuration: '3s'
            }}
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 hover:scale-110 transition-all duration-300">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeWidth="2"/>
                <circle cx="9" cy="7" r="4" strokeWidth="2"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeWidth="2"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeWidth="2"/>
              </svg>
            </div>
          </div>

          {/* Handshake Collaboration Icon - with spin animation */}
          <div 
            className="absolute transform -rotate-1 animate-spin"
            style={{ 
              left: '10px', 
              top: '120px',
              animationDelay: '1.5s',
              animationDuration: '4s'
            }}
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 hover:scale-110 transition-all duration-300">
              <FaHandshake className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Right side login form - moved more to the left and removed entrance animation */}
      <div className="absolute right-8 sm:right-12 md:right-16 lg:right-24 xl:right-32 top-1/2 transform -translate-y-1/2 z-10">
        <div 
          className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 md:p-12 w-72 sm:w-80 md:w-96 lg:w-[489px] hover:shadow-3xl transition-all duration-500"
          style={{
            boxShadow: '-10px -10px 50px 2px rgba(0, 0, 0, 0.25), 10px 10px 50px 2px rgba(0, 0, 0, 0.25)'
          }}
        >
          {/* Welcome Title - removed entrance animation */}
          <h2 className="text-black text-center font-poppins text-xl sm:text-2xl md:text-3xl font-semibold tracking-wide mb-8 sm:mb-12 hover:scale-105 transition-transform duration-300">
            Enter Your Credentials
          </h2>

          {/* Form - removed staggered animations for smoother experience */}
          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            {/* Username Field - removed entrance animation */}
            <div className="relative">
              <div className="flex items-center border border-gray-300 rounded bg-white h-10 sm:h-11 hover:border-blue-400 hover:shadow-md transition-all duration-300">
                <div className="pl-3 pr-2">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  className="flex-1 font-poppins text-base sm:text-lg font-light text-black tracking-wide outline-none bg-transparent transition-colors duration-300"
                  required
                />
              </div>
            </div>

            {/* Password Field - removed entrance animation */}
            <div className="relative">
              <div className="flex items-center border border-gray-300 rounded bg-white h-10 sm:h-11 hover:border-blue-400 hover:shadow-md transition-all duration-300">
                <div className="pl-3 pr-2">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="flex-1 font-poppins text-base sm:text-lg font-light text-black tracking-wide outline-none bg-transparent transition-colors duration-300"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="pr-3 pl-2 hover:scale-110 transition-transform duration-200"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 hover:text-blue-600 transition-colors duration-200" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 hover:text-blue-600 transition-colors duration-200" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Role Selection - removed entrance animation */}
            <div className="relative">
              <div className="flex items-center border border-gray-300 rounded bg-white h-10 sm:h-11 hover:border-blue-400 hover:shadow-md transition-all duration-300 focus-within:border-blue-500 focus-within:shadow-lg">
                <div className="pl-3 pr-2">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                  </svg>
                </div>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="flex-1 font-poppins text-base sm:text-lg font-light text-black tracking-wide outline-none bg-transparent transition-all duration-300 appearance-none cursor-pointer pr-8 login-select"
                  required
                >
                  <option value="Chair Person">Chair Person</option>
                  <option value="Vice Chairperson">Vice Chairperson</option>
                  <option value="Secretary">Secretary</option>
                  <option value="Treasurer">Treasurer</option>
                  <option value="Event Coordinator">Event Coordinator</option>
                  <option value="Tech Coordinator">Tech Coordinator</option>
                  <option value="Social Media Promotion Manager">Social Media Promotion Manager</option>
                  <option value="admin">admin</option>
                </select>
                <div className="absolute right-3 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Error Message with shake animation */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg animate-pulse">
                <p className="text-sm text-red-600 font-poppins">{error}</p>
              </div>
            )}

            {/* Login Button - removed entrance animation */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 rounded h-10 sm:h-12 flex items-center justify-center text-white font-poppins text-lg sm:text-xl font-normal tracking-wide hover:bg-blue-700 hover:scale-105 hover:shadow-lg active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                'Log In'
              )}
            </button>

            {/* Forgot Password - removed entrance animation */}
            <div className="text-center">
              <span className="text-gray-600 font-poppins text-sm sm:text-lg font-light">
                Forgot Password?{" "}
              </span>
              <button 
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-blue-600 font-poppins text-sm sm:text-lg font-light hover:underline hover:text-blue-800 transition-colors duration-300"
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
