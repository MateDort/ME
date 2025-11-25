'use client'

import { motion } from 'framer-motion'

interface ComingSoonAppProps {
  appName: string
  icon: string
  description: string
  features?: string[]
}

export default function ComingSoonApp({ appName, icon, description, features = [] }: ComingSoonAppProps) {
  return (
    <div className="h-full bg-[#f5f5dc] flex flex-col items-center justify-center p-8 font-mono">
      {/* Classic Mac pattern border */}
      <div className="absolute inset-4 border-2 border-black border-dashed opacity-20 pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        {/* Icon */}
        <motion.div
          className="text-8xl mb-6"
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {icon}
        </motion.div>

        {/* App Name */}
        <h1 className="text-3xl font-bold text-black mb-4 tracking-wide">
          {appName}
        </h1>

        {/* Coming Soon Badge */}
        <div className="inline-block bg-black text-white px-4 py-2 mb-6 text-sm tracking-widest">
          COMING SOON
        </div>

        {/* Description */}
        <p className="text-gray-700 mb-8 leading-relaxed">
          {description}
        </p>

        {/* Features list */}
        {features.length > 0 && (
          <div className="text-left bg-white border-2 border-black p-4 shadow-[4px_4px_0_#000]">
            <h3 className="font-bold mb-3 text-sm tracking-wide">PLANNED FEATURES:</h3>
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="text-xs">▸</span>
                  {feature}
                </motion.li>
              ))}
            </ul>
          </div>
        )}

        {/* Classic Mac-style message */}
        <p className="mt-8 text-xs text-gray-500 italic">
          "Good things come to those who wait"
        </p>
      </motion.div>
    </div>
  )
}

