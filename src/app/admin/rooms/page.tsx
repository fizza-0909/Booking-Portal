'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface RoomFormData {
    name: string;
    description: string;
    imageUrl: string;
    pricePerDay: {
        full: number;
        half: number;
    };
    pricePerMonth: {
        full: number;
        half: number;
    };
    securityDeposit: number;
}

export default function AdminRooms() {
    const router = useRouter();
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [formData, setFormData] = useState<RoomFormData>({
        name: '',
        description: '',
        imageUrl: '',
        pricePerDay: {
            full: 300,
            half: 160
        },
        pricePerMonth: {
            full: 2000,
            half: 1200
        },
        securityDeposit: 250
    });

    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        try {
            const response = await fetch('/api/rooms');
            const data = await response.json();
            setRooms(data);
        } catch (error) {
            toast.error('Failed to fetch rooms');
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedImage(e.target.files[0]);
        }
    };

    const uploadImage = async () => {
        if (!selectedImage) return '';

        const formData = new FormData();
        formData.append('file', selectedImage);
        formData.append('upload_preset', 'your_cloudinary_upload_preset'); // Replace with your Cloudinary upload preset

        try {
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/your_cloud_name/image/upload`, // Replace with your Cloudinary cloud name
                {
                    method: 'POST',
                    body: formData
                }
            );

            const data = await response.json();
            return data.secure_url;
        } catch (error) {
            toast.error('Failed to upload image');
            return '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // First upload the image
            const imageUrl = await uploadImage();
            if (!imageUrl) {
                toast.error('Please upload an image');
                setLoading(false);
                return;
            }

            // Then create the room
            const response = await fetch('/api/rooms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    imageUrl
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create room');
            }

            toast.success('Room created successfully');
            fetchRooms();
            // Reset form
            setFormData({
                name: '',
                description: '',
                imageUrl: '',
                pricePerDay: {
                    full: 300,
                    half: 160
                },
                pricePerMonth: {
                    full: 2000,
                    half: 1200
                },
                securityDeposit: 250
            });
            setSelectedImage(null);
        } catch (error) {
            toast.error('Failed to create room');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">Manage Rooms</h1>

                {/* Add Room Form */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h2 className="text-xl font-semibold mb-4">Add New Room</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Room Name</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Description</label>
                            <textarea
                                required
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                rows={3}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Room Image</label>
                            <input
                                type="file"
                                accept="image/*"
                                required
                                onChange={handleImageChange}
                                className="mt-1 block w-full"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                        >
                            {loading ? 'Creating...' : 'Create Room'}
                        </button>
                    </form>
                </div>

                {/* Room List */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4">Existing Rooms</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {rooms.map((room: any) => (
                            <div key={room._id} className="border rounded-lg p-4">
                                <img
                                    src={room.imageUrl}
                                    alt={room.name}
                                    className="w-full h-48 object-cover rounded-lg mb-4"
                                />
                                <h3 className="font-semibold">{room.name}</h3>
                                <p className="text-gray-600 text-sm">{room.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
} 