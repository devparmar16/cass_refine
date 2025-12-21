import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";

const mentors = [
  { name: "Dweepna Garg", subtitle: "HOD - DIT", img: "public/about_us/dweepna_mam_pfp.jpg" },
  { name: "Dr.Arpita Patel", subtitle: "Chapter Advisor", img: "/public/about_us/arpita_mam_pfp.jpg" },
];

const devs = [
  { name: "Dev Parmar", img: "public/about_us/dev_proflie.png" },
  { name: "Harsh Shah", img: "public/about_us/harsh_profile.png" },
  { name: "Ayush Patel", img: "public/about_us/ayush_profile.jpeg" },
  { name: "Prince Patel", img: "public/about_us/prince_pfp_temp.jpg" },
  { name: "Hetvi Suhagiya", img: "/path/to/hetvi-suhagiya.jpg" },
  { name: "Hetvi Suhagiya", img: "/path/to/hetvi-suhagiya2.jpg" },
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
      {/* Faculty Mentors */}
      <h2 className="text-2xl font-bold mb-8">Faculty Mentors</h2>
      <div className="flex flex-row gap-20 mb-16">
        {mentors.map((mentor, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: idx * 0.2 }}
            className="flex flex-col items-center"
          >
            <div className="w-56 h-56 bg-gray-300 rounded-full mb-4 shadow-lg overflow-hidden flex items-center justify-center">
              {mentor.img ? (
                <img
                  src={mentor.img}
                  alt={mentor.name}
                  className="object-cover w-full h-full"
                />
              ) : null}
            </div>
            <div className="text-xl font-semibold">{mentor.name}</div>
            <div className="text-base text-gray-600">{mentor.subtitle}</div>
          </motion.div>
        ))}
      </div>

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