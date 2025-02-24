import { motion } from "framer-motion";
import { FaVideo } from "react-icons/fa";

export default function RecordButton() {
    return (
        <motion.button
            className="flex items-center justify-center px-6 py-3 bg-red-600 text-white font-semibold rounded-full shadow-lg"
            whileTap={{ scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 10 }}
        >
            <FaVideo size={20} className="mr-2" />
            Start Recording
        </motion.button>
    );
}
