"use client"
import Link from "next/link"
import { useState } from "react"

export default function createRoom() {
    const [roomId, setRoomId] = useState("")
    return (
        <>
            <div>
                Create a room
            </div>
            <input type="text" placeholder="enter room id" onChange={(e) => {
                setRoomId(e.target.value)
            }} />
            <Link href={`/room/${roomId}`} >Create</Link >
        </>
    )
}