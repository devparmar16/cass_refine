import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";


const chairman = { name: "New Member", img: "" };

const devs = [
  { name: "Dev Parmar", img: "" },
  { name: "Harsh Shah", img: "" },
  { name: "Ayush Patel", img: "" },
  { name: "Prince Patel", img: "" },
  { name: "Hetvi Suhagiya", img: "" },
  { name: "Hetvi Suhagiya", img: "" },
];

const AboutUs = () => {
  const devSectionRef = useRef(null);
  const isDevSectionInView = useInView(devSectionRef, { once: true, margin: "-100px" });

  return (
    <motion.div
      initial={{ scale: 1.18, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 1, ease: "easeOut" }}
      className="min-h-screen bg-gray-50 flex flex-col items-center py-12"
      style={{ originY: 0, originX: 0.5 }}
    >
      {/* Chairman */}
      <h2 className="text-2xl font-bold mb-8">Chairman</h2>
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="flex flex-col items-center mb-12"
      >
        <div className="w-32 h-32 bg-gray-300 rounded-full mb-3 overflow-hidden flex items-center justify-center">
          {chairman.img ? (
            <img
              src={chairman.img}
              alt={chairman.name}
              className="object-cover w-full h-full"
            />
          ) : null}
        </div>
        <div className="text-base font-medium">{chairman.name}</div>
      </motion.div>

      {/* Development Team */}
      <h2 className="text-2xl font-bold mb-8">Development Team</h2>
      <motion.div
        ref={devSectionRef}
        initial={{ opacity: 0, y: 80, scale: 0.98 }}
        animate={isDevSectionInView ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="w-full flex flex-col items-center"
      >
        <div className="grid grid-cols-4 gap-12 mb-4">
          {devs.slice(0, 4).map((dev, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <div className="w-32 h-32 bg-gray-300 rounded-full mb-3 overflow-hidden flex items-center justify-center">
                {dev.img ? (
                  <img
                    src={dev.img}
                    alt={dev.name}
                    className="object-cover w-full h-full"
                  />
                ) : null}
              </div>
              <div className="text-base font-medium">{dev.name}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-12">
          {devs.slice(4).map((dev, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <div className="w-32 h-32 bg-gray-300 rounded-full mb-3 overflow-hidden flex items-center justify-center">
                {dev.img ? (
                  <img
                    src={dev.img}
                    alt={dev.name}
                    className="object-cover w-full h-full"
                  />
                ) : null}
              </div>
              <div className="text-base font-medium">{dev.name}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AboutUs;