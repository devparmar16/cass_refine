import { useState } from "react";

export default function Index() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    // TODO: Implement login logic
    console.log("Login attempt:", { username, password });
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-gradient-to-r from-ecass-light-gray to-ecass-dark-blue font-dm-sans">
      {/* Background circles */}
      <div 
        className="absolute rounded-full bg-ecass-gray opacity-100"
        style={{
          width: '1150px',
          height: '1150px',
          left: '-575px',
          top: '-58px'
        }}
      />
      <div 
        className="absolute rounded-full bg-ecass-blue"
        style={{
          width: '1100px',
          height: '1100px',
          left: '-550px',
          top: '-33px'
        }}
      />

      {/* Left side content */}
      <div className="absolute left-4 sm:left-14 top-24 sm:top-36 z-10">
        {/* Main Logo */}
        <div className="mb-8 sm:mb-12">
          <h1 className="text-white font-dm-sans text-4xl sm:text-6xl font-medium tracking-wider leading-tight mb-2">
            E-CASS
          </h1>
          <p className="text-white/60 text-center font-dm-sans text-lg sm:text-xl font-medium tracking-wider">
            IEEE Student Chapter
          </p>
        </div>

        {/* Tagline */}
        <div className="mb-12 sm:mb-16 max-w-md">
          <h2 className="text-white font-dm-sans text-2xl sm:text-4xl font-medium leading-tight">
            Empowering Event Execution with Clarity and Collaboration
          </h2>
        </div>

        {/* Decorative Icons */}
        <div className="relative w-96 h-96 hidden lg:block">
          {/* Calendar Icon */}
          <div 
            className="absolute transform -rotate-12"
            style={{ left: '0px', top: '40px' }}
          >
            <img 
              src="https://api.builder.io/api/v1/image/assets/TEMP/b894e37ba3b2c74efcfd3b7ba55bc7fc9eb82711?width=305" 
              alt="Calendar" 
              className="w-32 h-32"
            />
          </div>

          {/* Team Icon */}
          <div 
            className="absolute transform rotate-12"
            style={{ left: '200px', top: '150px' }}
          >
            <img 
              src="https://api.builder.io/api/v1/image/assets/TEMP/1df43ae3ad24bbe525710cc5775d12e6304e9e5e?width=305" 
              alt="Team" 
              className="w-32 h-32"
            />
          </div>

          {/* Conference Icon */}
          <div 
            className="absolute transform -rotate-1"
            style={{ left: '25px', top: '260px' }}
          >
            <img 
              src="https://api.builder.io/api/v1/image/assets/TEMP/c865f921222a1de63808f61961b896c20dc2b2fe?width=300" 
              alt="Conference" 
              className="w-32 h-32"
            />
          </div>
        </div>
      </div>

      {/* Right side login form */}
      <div className="absolute right-4 sm:right-8 lg:right-16 top-1/2 transform -translate-y-1/2 z-10">
        <div 
          className="bg-white rounded-xl shadow-2xl p-8 sm:p-12 w-80 sm:w-96 lg:w-[489px]"
          style={{
            boxShadow: '-10px -10px 50px 2px rgba(0, 0, 0, 0.25), 10px 10px 50px 2px rgba(0, 0, 0, 0.25)'
          }}
        >
          {/* Welcome Title */}
          <h2 className="text-black text-center font-dm-sans text-2xl sm:text-3xl font-semibold tracking-wide mb-12">
            Welcome Back, Chairperson!
          </h2>

          {/* Form */}
          <div className="space-y-8">
            {/* Username Field */}
            <div className="relative">
              <div className="flex items-center border border-black rounded bg-white h-11">
                <div className="pl-3 pr-2">
                  <img 
                    src="https://api.builder.io/api/v1/image/assets/TEMP/184c17feae04f73e1716722060ca77192d8a45e5?width=46" 
                    alt="User" 
                    className="w-6 h-6"
                  />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  className="flex-1 font-dm-sans text-2xl font-light text-ecass-text-gray tracking-wide outline-none bg-transparent"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="relative">
              <div className="flex items-center border border-black rounded bg-white h-11">
                <div className="pl-3 pr-2">
                  <img 
                    src="https://api.builder.io/api/v1/image/assets/TEMP/8ecb571e89bfa960ba4afa9dc409cbc4ce7c7615?width=46" 
                    alt="Key" 
                    className="w-6 h-6"
                  />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="flex-1 font-dm-sans text-2xl font-light text-ecass-text-gray tracking-wide outline-none bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="pr-3 pl-2"
                >
                  <img 
                    src="https://api.builder.io/api/v1/image/assets/TEMP/662f23de78a4171b04b9f2cfc30d3b53d1efdb22?width=62" 
                    alt="Show/Hide" 
                    className="w-8 h-8"
                  />
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              onClick={handleLogin}
              className="w-full bg-ecass-blue rounded h-12 flex items-center justify-center text-white font-dm-sans text-2xl font-normal tracking-wide hover:bg-blue-700 transition-colors"
            >
              Log In
            </button>

            {/* Forgot Password */}
            <div className="text-center">
              <span className="text-ecass-dark-text font-dm-sans text-xl font-light">
                Forgot Password?{" "}
              </span>
              <button className="text-ecass-blue font-dm-sans text-xl font-light hover:underline">
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 