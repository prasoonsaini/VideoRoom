import { motion } from "framer-motion";
import { FaYoutube, FaVideo, FaUsers, FaDesktop, FaCommentDots, FaBroadcastTower } from "react-icons/fa";

export default function VideoCallWithFloatingIcons() {
    const users = ["User 1", "User 2", "User 3", "User 4", "User 5", "User 6"];

    const floatingAnimation = (delay) => ({
        y: [0, -15, 0, 15, 0], // Floating motion
        x: [0, 10, -10, 5, -5, 0],
        transition: { duration: 4, repeat: Infinity, ease: "easeInOut", delay },
    });

    const icons = [
        { icon: <FaYoutube />, color: "text-red-600", delay: 0, position: "top-0 left-30" },
        { icon: <FaVideo />, color: "text-purple-600", delay: 0.5, position: "top-0 right-10" },
        { icon: <FaUsers />, color: "text-blue-500", delay: 1, position: "bottom-20 left-10" },
        { icon: <FaDesktop />, color: "text-green-500", delay: 1.5, position: "top-20 right-10" },
        { icon: <FaCommentDots />, color: "text-yellow-500", delay: 2, position: "top-10 left-1/4" },
        { icon: <FaBroadcastTower />, color: "text-orange-500", delay: 2.5, position: "top-10 right-1/4" },
    ];

    return (
        <div className="w-full flex flex-col items-center space-y-6 relative py-10">
            {/* Floating Icons (Now Positioned Around the Grid) */}
            {icons.map((item, index) => (
                <motion.div
                    key={index}
                    className={`absolute w-12 h-12 flex items-center justify-center ${item.color} bg-white shadow-lg rounded-full ${item.position}`}
                    animate={floatingAnimation(item.delay)}
                >
                    {item.icon}
                </motion.div>
            ))}

            {/* Centered Multi-User Video Grid */}
            {/* <div className="grid grid-cols-3 gap-4 p-6 relative">
                {users.map((user, index) => (
                    <motion.div
                        key={index}
                        className="w-24 h-24 flex items-center justify-center bg-blue-500 text-white font-bold rounded-lg shadow-md"
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 150, damping: 10, delay: index * 0.1 }}
                    >
                        {user}
                    </motion.div>
                ))}
            </div> */}

            {/* Bottom Margin */}
            <div className="h-20"></div>
        </div>
    );
}
