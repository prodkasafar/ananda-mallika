import React, { useState, Suspense, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerspectiveCamera, Float, ContactShadows, Environment, OrbitControls } from '@react-three/drei'
import { Calendar, Users, MapPin, Star, ChevronRight, ChevronLeft, Home, Menu, X, CheckCircle2, Sun, Moon, LogIn, User, LogOut, Trash2, ShieldCheck, ShieldAlert, Plus, Pencil, Phone, Filter } from 'lucide-react'
import { auth } from './firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'

// --- Helpers ---
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

const getPropertyTypes = () => {
  const stored = localStorage.getItem('property_types')
  if (stored) return JSON.parse(stored)
  const defaults = ['Forest Cabin', 'Amber Villa', 'Crimson Lodge']
  localStorage.setItem('property_types', JSON.stringify(defaults))
  return defaults
}



function MiniatureHouse({ scrollRotation }) {
  const mesh = useRef()
  useFrame((state) => { if (mesh.current) { mesh.current.rotation.y = scrollRotation.get() * Math.PI * 0.5 } })
  return (
    <group ref={mesh} scale={0.8}>
      <mesh castShadow receiveShadow position={[0, 0.5, 0]}><boxGeometry args={[2, 1, 2]} /><meshStandardMaterial color="#ffffff" roughness={0.1} metalness={0.2} /></mesh>
      <mesh castShadow receiveShadow position={[0, 1.5, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[1.8, 1.2, 4]} /><meshStandardMaterial color="#5B7E3C" roughness={0.3} /></mesh>
      <mesh position={[0.6, 0.5, 1.01]}><boxGeometry args={[0.4, 0.4, 0.05]} /><meshStandardMaterial color="#FFD65A" emissive="#FF9D23" emissiveIntensity={0.8} /></mesh>
      <mesh position={[-0.6, 0.5, 1.01]}><boxGeometry args={[0.4, 0.4, 0.05]} /><meshStandardMaterial color="#FFD65A" emissive="#FF9D23" emissiveIntensity={0.8} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow><circleGeometry args={[2.5, 32]} /><meshStandardMaterial color="#f0f9eb" /></mesh>
    </group>
  )
}

function Scene({ scrollRotation }) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[4, 3, 4]} fov={45} />
      <ambientLight intensity={1.5} />
      <spotLight position={[5, 10, 5]} angle={0.15} penumbra={1} intensity={2} castShadow />
      <pointLight position={[-5, -5, -5]} intensity={1} color="#FF9D23" />
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}><MiniatureHouse scrollRotation={scrollRotation} /></Float>
      <ContactShadows position={[0, -0.01, 0]} opacity={0.2} scale={10} blur={2} far={4.5} />
      <Environment preset="park" />
    </>
  )
}

// --- Admin Dashboard Component ---

const AdminDashboard = ({ onBack, currentUser }) => {
  const [allBookings, setAllBookings] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [propertyTypes, setPropertyTypes] = useState([])
  const [newPropertyName, setNewPropertyName] = useState('')
  const [editingIndex, setEditingIndex] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [notification, setNotification] = useState(null)
  const [expandedBookingId, setExpandedBookingId] = useState(null)
  const [bookingFilters, setBookingFilters] = useState({ id: '', name: '', property: '', checkIn: '', checkOut: '', status: '' })
  const [activeFilterDropdown, setActiveFilterDropdown] = useState(null)

  const loadData = async () => {
    try {
      const [bookingsRes, usersRes, propsRes] = await Promise.all([
        fetch('http://localhost:3001/api/bookings'),
        fetch('http://localhost:3001/api/users'),
        fetch('http://localhost:3001/api/properties')
      ]);
      const bookings = await bookingsRes.json();
      const users = await usersRes.json();
      const props = await propsRes.json();
      setAllBookings(Array.isArray(bookings) ? bookings : []);
      setAllUsers(Array.isArray(users) ? users : []);
      setPropertyTypes(Array.isArray(props) ? props : []);
    } catch (e) {
      console.error('Failed to load data from API:', e);
    }
  }

  useEffect(() => { loadData() }, [])
  useEffect(() => { if (notification) { const t = setTimeout(() => setNotification(null), 3000); return () => clearTimeout(t) } }, [notification])

  useEffect(() => {
    const handleDocClick = () => setActiveFilterDropdown(null)
    document.addEventListener('click', handleDocClick)
    return () => document.removeEventListener('click', handleDocClick)
  }, [])

  const handleToggleRole = async (email) => {
    const user = allUsers.find(u => u.email === email);
    if (!user) return;
    const newRole = user.role === 'Administrator' ? 'Guest' : 'Administrator';
    try {
      await fetch('http://localhost:3001/api/users/role', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: newRole })
      });
      setAllUsers(allUsers.map(u => u.email === email ? { ...u, role: newRole } : u));
      setNotification(`Role for ${email} updated`);
    } catch (e) {
      console.error(e);
    }
  }

  const handleAdminCancel = async (bookingId) => {
    try {
      await fetch(`http://localhost:3001/api/bookings/${bookingId}/cancel`, { method: 'PUT' });
      setAllBookings(allBookings.map(b => b.id === bookingId ? { ...b, status: 'Cancelled' } : b));
      setNotification('Booking cancelled successfully');
    } catch (e) {
      console.error(e);
    }
  }

  // Property management
  const handleAddProperty = async () => {
    if (!newPropertyName.trim()) return
    try {
      await fetch('http://localhost:3001/api/properties', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPropertyName.trim() })
      });
      setPropertyTypes([...propertyTypes, newPropertyName.trim()]);
      setNotification(`Property "${newPropertyName.trim()}" added`);
      setNewPropertyName('');
    } catch (e) {
      console.error(e);
    }
  }

  const handleSaveProperty = async (index) => {
    if (!editingName.trim()) return
    const oldName = propertyTypes[index]
    try {
      await fetch('http://localhost:3001/api/properties', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName, newName: editingName.trim() })
      });
      const updated = [...propertyTypes];
      updated[index] = editingName.trim();
      setPropertyTypes(updated);
      setAllBookings(allBookings.map(b => b.property === oldName ? { ...b, property: editingName.trim() } : b));
      setEditingIndex(null);
      setNotification(`Property renamed to "${editingName.trim()}"`);
    } catch (e) {
      console.error(e);
    }
  }

  const handleDeleteProperty = async (index) => {
    const name = propertyTypes[index]
    try {
      await fetch(`http://localhost:3001/api/properties/${encodeURIComponent(name)}`, { method: 'DELETE' });
      setPropertyTypes(propertyTypes.filter((_, i) => i !== index));
      setNotification(`Property "${name}" deleted`);
    } catch (e) {
      console.error(e);
    }
  }

  const tableStyle = { width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '2.5rem' }
  const thStyle = { textAlign: 'left', padding: '1rem', background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }
  const tdStyle = { padding: '1rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem', whiteSpace: 'nowrap' }
  const sidebarWidth = sidebarCollapsed ? '80px' : '280px'
  const inputStyle = { padding: '0.8rem 1rem', borderRadius: '10px', border: '2px solid #e2e8f0', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }

  const navItemStyle = (tab) => ({
    display: 'flex', alignItems: 'center', gap: sidebarCollapsed ? '0' : '1rem',
    padding: sidebarCollapsed ? '1rem' : '1rem 1.5rem', borderRadius: '12px', cursor: 'pointer',
    fontWeight: 700, fontSize: '0.95rem', transition: 'all 0.25s ease',
    background: activeTab === tab ? '#5B7E3C' : 'transparent',
    color: activeTab === tab ? 'white' : '#64748b',
    border: 'none', width: '100%', textAlign: 'left',
    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
    overflow: 'hidden', whiteSpace: 'nowrap'
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'inherit' }}>
      {/* Sidebar */}
      <aside style={{ width: sidebarWidth, background: 'white', borderRight: '1px solid #e2e8f0', padding: sidebarCollapsed ? '2rem 0.8rem' : '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem', position: 'fixed', height: '100vh', transition: 'all 0.25s ease', overflow: 'hidden', zIndex: 10 }}>
        <div style={{ display: 'flex', flexDirection: sidebarCollapsed ? 'column' : 'row', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between', gap: '0.8rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', overflow: 'hidden' }}>
            <div style={{ background: '#5B7E3C', padding: '0.5rem', borderRadius: '12px', display: 'flex', flexShrink: 0 }}><ShieldCheck color="white" size={24} /></div>
            {!sidebarCollapsed && <span style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.5px', color: '#1e293b', whiteSpace: 'nowrap' }}>Admin Central</span>}
          </div>
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} title={sidebarCollapsed ? 'Expand' : 'Collapse'} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color: '#64748b' }}>
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          <button onClick={() => setActiveTab('overview')} style={navItemStyle('overview')} title="Overview">
            <Home size={20} style={{ flexShrink: 0 }} /> {!sidebarCollapsed && 'Overview'}
          </button>
          <button onClick={() => setActiveTab('bookings')} style={navItemStyle('bookings')} title="Bookings">
            <Calendar size={20} style={{ flexShrink: 0 }} /> {!sidebarCollapsed && 'Bookings'}
          </button>
          <button onClick={() => setActiveTab('properties')} style={navItemStyle('properties')} title="Properties">
            <MapPin size={20} style={{ flexShrink: 0 }} /> {!sidebarCollapsed && 'Properties'}
          </button>
          <button onClick={() => setActiveTab('users')} style={navItemStyle('users')} title="User Roles">
            <Users size={20} style={{ flexShrink: 0 }} /> {!sidebarCollapsed && 'User Roles'}
          </button>
        </nav>

        <button onClick={onBack} title="Exit Admin" style={{ background: '#1e293b', color: 'white', padding: '1rem', borderRadius: '12px', fontWeight: 700, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: sidebarCollapsed ? '0' : '0.8rem', transition: 'all 0.25s ease', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          <LogOut size={18} style={{ flexShrink: 0 }} /> {!sidebarCollapsed && 'Exit Admin'}
        </button>
      </aside>

      {/* Main Content */}
      <main style={{ marginLeft: sidebarWidth, flex: 1, padding: '3rem 4rem', transition: 'margin-left 0.25s ease' }}>
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
            {notification && (
              <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '1rem 2rem', borderRadius: '12px', marginBottom: '2rem', border: '2px solid #bbf7d0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <CheckCircle2 size={20} /> {notification}
              </div>
            )}

            {activeTab === 'overview' && (
              <>
                <header style={{ marginBottom: '3rem' }}>
                  <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800 }}>Dashboard Overview</h1>
                  <p style={{ color: '#64748b', marginTop: '0.5rem' }}>System performance and key metrics at a glance.</p>
                </header>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
                  <div style={{ background: 'white', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04)', borderLeft: '8px solid #5B7E3C' }}>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '1rem', fontWeight: 600 }}>Active Bookings</p>
                    <h2 style={{ margin: '0.5rem 0 0', fontSize: '3rem', fontWeight: 800 }}>{allBookings.length}</h2>
                  </div>
                  <div style={{ background: 'white', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04)', borderLeft: '8px solid #FF9D23' }}>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '1rem', fontWeight: 600 }}>Total Users</p>
                    <h2 style={{ margin: '0.5rem 0 0', fontSize: '3rem', fontWeight: 800 }}>{allUsers.length}</h2>
                  </div>
                  <div style={{ background: 'white', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04)', borderLeft: '8px solid #EA5252' }}>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '1rem', fontWeight: 600 }}>Property Types</p>
                    <h2 style={{ margin: '0.5rem 0 0', fontSize: '3rem', fontWeight: 800 }}>{propertyTypes.length}</h2>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'bookings' && (
              <>
                <header style={{ marginBottom: '2rem' }}>
                  <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800 }}>Reservations Management</h1>
                  <p style={{ color: '#64748b', marginTop: '0.5rem' }}>View and manage all guest stays across properties.</p>
                </header>

                {(() => {
                  const filteredBookings = allBookings.filter(b => {
                    if (bookingFilters.id && !b.id?.toLowerCase().includes(bookingFilters.id.toLowerCase())) return false;
                    if (bookingFilters.name && !b.guestName?.toLowerCase().includes(bookingFilters.name.toLowerCase())) return false;
                    if (bookingFilters.property && b.property !== bookingFilters.property) return false;
                    if (bookingFilters.checkIn && b.checkIn !== bookingFilters.checkIn) return false;
                    if (bookingFilters.checkOut && b.checkOut !== bookingFilters.checkOut) return false;
                    const currentStatus = b.status || 'Confirmed';
                    if (bookingFilters.status && currentStatus !== bookingFilters.status) return false;
                    return true;
                  });

                  const renderFilterTh = (colKey, title, inputElement) => {
                    const isActive = bookingFilters[colKey] !== '';
                    return (
                      <th style={{ ...thStyle, padding: '0' }}>
                        <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', position: 'relative' }}>
                          <span>{title}</span>
                          <div onClick={(e) => { e.stopPropagation(); setActiveFilterDropdown(activeFilterDropdown === colKey ? null : colKey); }} style={{ cursor: 'pointer', padding: '0.3rem', borderRadius: '6px', background: isActive ? '#dcfce7' : 'transparent', display: 'flex', transition: 'background 0.2s' }}>
                            <Filter size={14} color={isActive ? '#16a34a' : '#94a3b8'} />
                          </div>
                          <AnimatePresence>
                            {activeFilterDropdown === colKey && (
                              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: '100%', left: 0, background: 'white', padding: '1.2rem', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', zIndex: 50, border: '1px solid #e2e8f0', minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Filter by {title}</p>
                                <div style={{ width: '100%' }}>{inputElement}</div>
                                {isActive && <button onClick={() => setBookingFilters({ ...bookingFilters, [colKey]: '' })} style={{ width: '100%', background: '#fff1f2', color: '#e11d48', border: '1px solid #fda4af', padding: '0.6rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', boxSizing: 'border-box' }}>Clear Filter</button>}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </th>
                    );
                  };

                  return (
                    <>
                      <div style={{ overflowX: 'visible', paddingBottom: '150px' }}>
                        <table style={{ ...tableStyle, overflow: 'visible' }}>
                          <thead>
                            <tr>
                              {renderFilterTh('id', 'Booking ID', <input placeholder="e.g. #AMB-000001" value={bookingFilters.id} onChange={e => setBookingFilters({ ...bookingFilters, id: e.target.value })} style={inputStyle} autoFocus />)}
                              {renderFilterTh('name', 'Name', <input placeholder="e.g. John Doe" value={bookingFilters.name} onChange={e => setBookingFilters({ ...bookingFilters, name: e.target.value })} style={inputStyle} autoFocus />)}
                              {renderFilterTh('property', 'Property',
                                <select value={bookingFilters.property} onChange={e => setBookingFilters({ ...bookingFilters, property: e.target.value })} style={inputStyle}>
                                  <option value="">All Properties</option>
                                  {propertyTypes.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                                </select>
                              )}
                              {renderFilterTh('checkIn', 'Check-in', <input type="date" value={bookingFilters.checkIn} onChange={e => setBookingFilters({ ...bookingFilters, checkIn: e.target.value })} style={inputStyle} />)}
                              {renderFilterTh('checkOut', 'Check-out', <input type="date" value={bookingFilters.checkOut} onChange={e => setBookingFilters({ ...bookingFilters, checkOut: e.target.value })} style={inputStyle} />)}
                              {renderFilterTh('status', 'Status',
                                <select value={bookingFilters.status} onChange={e => setBookingFilters({ ...bookingFilters, status: e.target.value })} style={inputStyle}>
                                  <option value="">All Statuses</option>
                                  <option>Confirmed</option>
                                  <option>Cancelled</option>
                                </select>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredBookings.map((b, i) => (
                              <React.Fragment key={i}>
                                <tr style={{ cursor: 'pointer', background: expandedBookingId === b.id ? '#f8fafc' : 'white', transition: 'background 0.2s' }} onClick={() => setExpandedBookingId(expandedBookingId === b.id ? null : b.id)}>
                                  <td style={tdStyle}><strong style={{ color: '#1e293b' }}>{b.id || '—'}</strong></td>
                                  <td style={tdStyle}><strong>{b.guestName || '—'}</strong></td>
                                  <td style={tdStyle}><span style={{ fontWeight: 700, color: '#5B7E3C' }}>{b.property}</span></td>
                                  <td style={tdStyle}>{formatDate(b.checkIn)}</td>
                                  <td style={tdStyle}>{formatDate(b.checkOut)}</td>
                                  <td style={tdStyle}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }} onClick={e => e.stopPropagation()}>
                                      <span style={{ background: '#dcfce7', color: '#16a34a', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>{b.status || 'Confirmed'}</span>
                                      <button onClick={() => handleAdminCancel(b.id)} style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fda4af', padding: '0.4rem 0.8rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>Cancel</button>
                                    </div>
                                  </td>
                                </tr>
                                {expandedBookingId === b.id && (
                                  <tr>
                                    <td colSpan={6} style={{ padding: 0, borderBottom: '1px solid #f1f5f9' }}>
                                      <div style={{ padding: '1.5rem', background: '#f8fafc', margin: '0.5rem 1rem 1.5rem 1rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                                          <div><p style={{ margin: '0 0 0.3rem 0', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Email</p><p style={{ margin: 0, fontWeight: 600, color: '#1e293b' }}>{b.userEmail || '—'}</p></div>
                                          <div><p style={{ margin: '0 0 0.3rem 0', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Mobile</p><p style={{ margin: 0, fontWeight: 600, color: '#1e293b' }}>{b.countryCode ? b.countryCode + ' ' : ''}{b.mobile || '—'}</p></div>
                                          <div><p style={{ margin: '0 0 0.3rem 0', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Date of Birth</p><p style={{ margin: 0, fontWeight: 600, color: '#1e293b' }}>{b.dob ? formatDate(b.dob) : (b.age || '—')}</p></div>
                                          <div><p style={{ margin: '0 0 0.3rem 0', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Gender</p><p style={{ margin: 0, fontWeight: 600, color: '#1e293b' }}>{b.gender || '—'}</p></div>
                                          <div><p style={{ margin: '0 0 0.3rem 0', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>No. of Guests</p><p style={{ margin: 0, fontWeight: 600, color: '#1e293b' }}>{b.guests || '—'}</p></div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                            {filteredBookings.length === 0 && <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', padding: '3rem' }}>No bookings found.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                })()}
              </>
            )}

            {activeTab === 'properties' && (
              <>
                <header style={{ marginBottom: '3rem' }}>
                  <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800 }}>Property Types</h1>
                  <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Add, edit or remove the types of stays available for booking.</p>
                </header>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem' }}>
                  <input value={newPropertyName} onChange={e => setNewPropertyName(e.target.value)} placeholder="New property name..." style={inputStyle} onKeyDown={e => e.key === 'Enter' && handleAddProperty()} />
                  <button onClick={handleAddProperty} style={{ background: '#5B7E3C', color: 'white', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', whiteSpace: 'nowrap' }}><Plus size={18} /> Add</button>
                </div>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {propertyTypes.map((pt, i) => (
                    <div key={i} style={{ background: 'white', padding: '1.5rem 2rem', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                      {editingIndex === i ? (
                        <div style={{ display: 'flex', gap: '0.8rem', flex: 1 }}>
                          <input value={editingName} onChange={e => setEditingName(e.target.value)} style={{ ...inputStyle, flex: 1 }} onKeyDown={e => e.key === 'Enter' && handleSaveProperty(i)} />
                          <button onClick={() => handleSaveProperty(i)} style={{ background: '#5B7E3C', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Save</button>
                          <button onClick={() => setEditingIndex(null)} style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <MapPin size={20} color="#5B7E3C" />
                            <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{pt}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.6rem' }}>
                            <button onClick={() => { setEditingIndex(i); setEditingName(pt) }} style={{ background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Pencil size={14} /> Edit</button>
                            <button onClick={() => handleDeleteProperty(i)} style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fda4af', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Trash2 size={14} /> Delete</button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {propertyTypes.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center', padding: '3rem' }}>No property types defined. Add one above.</p>}
                </div>
              </>
            )}

            {activeTab === 'users' && (
              <>
                <header style={{ marginBottom: '3rem' }}>
                  <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800 }}>User & Access Control</h1>
                  <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Manage system permissions and user accounts.</p>
                </header>
                <table style={tableStyle}>
                  <thead><tr><th style={thStyle}>User Name</th><th style={thStyle}>Email</th><th style={thStyle}>Current Role</th><th style={thStyle}>Actions</th></tr></thead>
                  <tbody>
                    {allUsers.map((u, i) => (
                      <tr key={i}>
                        <td style={tdStyle}>{u.name}</td>
                        <td style={tdStyle}>{u.email}</td>
                        <td style={tdStyle}>
                          <span style={{ background: u.role === 'Administrator' ? '#f0f9ff' : '#f8fafc', color: u.role === 'Administrator' ? '#0284c7' : '#64748b', padding: '0.5rem 1rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 800, border: u.role === 'Administrator' ? '1px solid #bae6fd' : '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase' }}>
                            {u.role === 'Administrator' ? <ShieldCheck size={14} /> : <User size={14} />}
                            {u.role || 'Guest'}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: '0.8rem' }}>
                            {u.email !== 'prodkasafar@gmail.com' && (
                              <button onClick={() => handleToggleRole(u.email)} style={{ background: 'white', border: '2px solid #5B7E3C', color: '#5B7E3C', padding: '0.6rem 1.2rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>Set as {u.role === 'Administrator' ? 'Guest' : 'Administrator'}</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}



// --- UI Components ---

const Navbar = ({ onOpenBooking, onOpenMyBookings, onOpenLogin, onOpenAdmin, onLogout, user }) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const isAdmin = user?.role === 'Administrator'

  return (
    <nav className="glass" style={{ position: 'fixed', top: 0, width: '100%', zIndex: 1000, padding: '1rem 0' }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div onClick={() => window.location.href = '/'} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer' }} title="Reload Home">
          <div style={{ background: '#5B7E3C', padding: '0.5rem', borderRadius: '12px', display: 'flex' }}><Home color="white" size={24} /></div>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.5px', color: '#5B7E3C' }}>LuxeStay</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <a href="#about" style={{ color: 'var(--foreground)', textDecoration: 'none', fontWeight: 600 }}>Explore</a>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {isAdmin && (
              <button onClick={onOpenAdmin} style={{ background: '#1e293b', color: 'white', padding: '0.8rem 1.2rem', borderRadius: '10px', fontWeight: 700, border: 'none', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', whiteSpace: 'nowrap' }}>
                <ShieldCheck size={18} /> Admin tools
              </button>
            )}
            <button onClick={onOpenBooking} className="btn-booking" style={{ borderRadius: '10px', whiteSpace: 'nowrap' }}>Book Now</button>
          </div>
          {user ? (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: '#5B7E3C', fontWeight: 700, background: 'var(--surface)', border: '2px solid #5B7E3C', padding: '0.6rem 1.4rem', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                <User size={20} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.95rem' }}>{user.name}</span>
                  {user.role === 'Administrator' && (
                    <span style={{ fontSize: '0.65rem', color: '#FF9D23', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Administrator
                    </span>
                  )}
                </div>
              </button>
              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="glass" style={{ position: 'absolute', top: '120%', right: 0, minWidth: '220px', padding: '0.6rem', borderRadius: '16px', zIndex: 1001 }}>
                    <button onClick={() => { onOpenMyBookings(); setIsUserMenuOpen(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '1rem', color: 'var(--foreground)', fontWeight: 600, background: 'none', border: 'none', borderRadius: '10px', cursor: 'pointer', textAlign: 'left' }}><Calendar size={18} color="#FF9D23" /> My Bookings</button>
                    <div style={{ height: '1px', background: 'var(--border)', margin: '0.5rem 0' }} />
                    <button onClick={() => { onLogout(); setIsUserMenuOpen(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '1rem', color: '#EA5252', fontWeight: 700, background: 'none', border: 'none', borderRadius: '10px', cursor: 'pointer', textAlign: 'left' }}><LogOut size={18} /> Logoff</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button onClick={onOpenLogin} className="btn-signin"><LogIn size={20} />Sign In</button>
          )}
        </div>
      </div>
    </nav>
  )
}

const Hero = ({ onOpenBooking }) => {
  const { scrollYProgress } = useScroll()
  const opacity = useTransform(scrollYProgress, [0, 0.3], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95])
  return (
    <section className="hero" style={{ paddingTop: '180px', position: 'relative', overflow: 'hidden', minHeight: '100vh' }}>
      <div style={{ position: 'absolute', top: '15%', right: '5%', width: '600px', height: '600px', zIndex: 0, pointerEvents: 'none' }}>
        <Canvas shadows alpha><Suspense fallback={null}><Scene scrollRotation={scrollYProgress} /></Suspense></Canvas>
      </div>
      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <motion.div style={{ opacity, scale, textAlign: 'left' }} initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1.2, ease: "easeOut" }}>
          <div style={{ marginBottom: '2.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.8rem', padding: '0.6rem 2rem', borderRadius: '100px', background: 'white', border: '1px solid #5B7E3C', boxShadow: 'var(--shadow)' }}>
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}><Star size={18} color="#FF9D23" fill="#FF9D23" /></motion.div>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#5B7E3C', letterSpacing: '0.5px' }}>VIBRANT FOREST STAYS</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 5.5rem)', marginBottom: '2rem', maxWidth: '850px', fontWeight: 800, color: 'var(--foreground)' }}>Where <span style={{ color: '#5B7E3C' }}>Nature</span> Meets <br /><span style={{ color: '#FF9D23' }}>Passion</span> & <span style={{ color: '#FFD65A' }}>Light</span>.</h1>
          <p style={{ fontSize: '1.5rem', color: '#64748b', marginBottom: '4rem', maxWidth: '650px', fontWeight: 400, lineHeight: 1.6 }}>Experience the harmony of our expanded palette. From the deep forest greens to the fiery red sunset.</p>
          <div style={{ display: 'flex', gap: '2rem' }}><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onOpenBooking} className="btn-primary" style={{ fontSize: '1.2rem', padding: '1.2rem 3.5rem' }}>Explore Stays</motion.button></div>
        </motion.div>
      </div>
    </section>
  )
}

const LoginModal = ({ isOpen, onClose, onLogin }) => {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  useEffect(() => { if (isOpen) { setIsRegister(false); setError(''); setSuccess(''); setEmail(''); setPassword(''); } }, [isOpen])

  const handleGoogleSignIn = async () => {
    setError('')
    setSuccess('')
    try {
      if (!auth) throw new Error("Firebase is not configured. Add credentials to src/firebase.js");
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;

      const existingUsers = JSON.parse(localStorage.getItem('user_accounts') || '[]')
      let userData = existingUsers.find(u => u.email === email)
      if (!userData) {
        const isAdmin = email === 'prodkasafar@gmail.com'
        userData = { name: email.split('@')[0], email, role: isAdmin ? 'Administrator' : 'Guest' }
        localStorage.setItem('user_accounts', JSON.stringify([...existingUsers, userData]))
      }
      onLogin(userData)
      onClose()
    } catch (err) {
      setError(err.message || 'System error with Google Sign-In.')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      if (isRegister) {
        if (!auth) throw new Error("Firebase is not configured. Add credentials to src/firebase.js");
        await createUserWithEmailAndPassword(auth, email, password)
        const isAdmin = email === 'prodkasafar@gmail.com'
        const newUser = { name: email.split('@')[0], email, role: isAdmin ? 'Administrator' : 'Guest' }
        const existingUsers = JSON.parse(localStorage.getItem('user_accounts') || '[]')
        if (!existingUsers.find(u => u.email === email)) {
          localStorage.setItem('user_accounts', JSON.stringify([...existingUsers, newUser]))
        }
        setSuccess('Account created successfully! Please sign in.')
        setIsRegister(false)
        setEmail('')
        setPassword('')
      } else {
        if (!auth) throw new Error("Firebase is not configured. Add credentials to src/firebase.js");
        await signInWithEmailAndPassword(auth, email, password)
        const existingUsers = JSON.parse(localStorage.getItem('user_accounts') || '[]')
        let userData = existingUsers.find(u => u.email === email)
        if (!userData) {
          userData = { name: email.split('@')[0], email, role: 'Guest' }
          localStorage.setItem('user_accounts', JSON.stringify([...existingUsers, userData]))
        }
        onLogin(userData)
        onClose()
      }
    } catch (err) {
      setError(err.message || 'System error. Please try again.')
    }
  }
  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(10px)' }} />
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="glass" style={{ width: '100%', maxWidth: '420px', padding: '3.5rem 3rem', borderRadius: '32px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={20} /></button>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <h2 style={{ fontSize: '2.4rem', fontWeight: 800 }}>{isRegister ? 'Join Us' : 'Welcome'}</h2>
              <p style={{ color: '#64748b' }}>{isRegister ? 'Create a guest account.' : 'Sign in to access stays.'}</p>
            </div>
            {error && <div style={{ background: '#fff1f2', color: '#e11d48', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '2px solid #fda4af', textAlign: 'center' }}>{error}</div>}
            {success && <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '2px solid #bbf7d0', textAlign: 'center', fontWeight: 600 }}>{success}</div>}
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.2rem' }}>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '1.2rem', borderRadius: '16px', border: '2px solid #e2e8f0' }} required placeholder="Email Address" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '1.2rem', borderRadius: '16px', border: '2px solid #e2e8f0' }} required placeholder="Password" />
              <button type="submit" className="btn-signin" style={{ height: '60px', justifyContent: 'center' }}>{isRegister ? 'Sign Up' : 'Sign In'}</button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
              <span style={{ padding: '0 1rem', color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600 }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
            </div>

            <button onClick={handleGoogleSignIn} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', padding: '1rem', background: 'white', border: '2px solid #e2e8f0', borderRadius: '16px', fontSize: '1rem', fontWeight: 700, color: '#1e293b', cursor: 'pointer', transition: 'all 0.2s' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
              Continue with Google
            </button>

            <button onClick={() => { setIsRegister(!isRegister); setError(''); }} style={{ width: '100%', marginTop: '1.5rem', background: 'none', color: '#5B7E3C', fontWeight: 700, textDecoration: 'underline', border: 'none', cursor: 'pointer' }}>{isRegister ? 'Already have an account? Sign In' : 'Need an account? Create one'}</button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

const BookingModal = ({ isOpen, onClose, onBookingComplete, user, onOpenLogin }) => {
  const [step, setStep] = useState(1)
  const [propertyTypes, setPropertyTypes] = useState([])
  const [bookingData, setBookingData] = useState({ checkIn: '', checkOut: '', guests: 1, property: '', guestName: '', dob: '', gender: '', countryCode: '+91', mobile: '', status: 'Confirmed' })
  const [formErrors, setFormErrors] = useState({})
  const [availabilityStatus, setAvailabilityStatus] = useState('idle')
  const [generatedBookingId, setGeneratedBookingId] = useState('')
  const [countryCodes, setCountryCodes] = useState(['+1', '+44', '+61', '+81', '+91'])
  const fStyle = { padding: '1rem', borderRadius: '14px', border: '1px solid var(--border)', fontSize: '0.95rem', width: '100%', boxSizing: 'border-box' }
  const fStyleError = { ...fStyle, border: '2px solid #EA5252' }

  useEffect(() => {
    fetch('https://restcountries.com/v3.1/all?fields=idd')
      .then(res => res.json())
      .then(data => {
        const codes = data.filter(c => c.idd && c.idd.root).map(c => (c.idd.suffixes || ['']).map(s => c.idd.root + s)).flat()
        const unique = [...new Set(codes)].sort((a, b) => parseInt(a.replace('+', '')) - parseInt(b.replace('+', '')))
        if (unique.length > 0) setCountryCodes(unique)
      })
      .catch(() => { })

    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        if (data.country_calling_code) {
          setBookingData(prev => ({ ...prev, countryCode: data.country_calling_code }))
        }
      })
      .catch(() => { })
  }, [])

  useEffect(() => {
    if (isOpen) {
      const types = getPropertyTypes()
      setPropertyTypes(types)
      setStep(1)
      setFormErrors({})
      setAvailabilityStatus('idle')
      setBookingData(prev => ({ checkIn: '', checkOut: '', guests: 1, property: types[0] || '', guestName: '', dob: '', gender: '', countryCode: prev.countryCode || '+91', mobile: '', status: 'Confirmed' }))
    }
  }, [isOpen])

  useEffect(() => {
    setAvailabilityStatus('idle')
  }, [bookingData.checkIn, bookingData.checkOut, bookingData.property])

  const validate = () => {
    const errors = {}
    // DOB validation: must be at least 18
    if (bookingData.dob) {
      const dobDate = new Date(bookingData.dob);
      const today = new Date();
      let age = today.getFullYear() - dobDate.getFullYear();
      const m = today.getMonth() - dobDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
        age--;
      }
      if (age < 18) {
        errors.dob = 'Guest must be at least 18 years old to make a booking.'
      }
    }
    // Date validation: checkout must be after checkin, and checkin cannot be in the past
    if (bookingData.checkIn) {
      const checkInDate = new Date(bookingData.checkIn + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (checkInDate < today) {
        errors.dates = 'Check-in date cannot be in the past.'
      }
    }
    if (bookingData.checkIn && bookingData.checkOut) {
      if (new Date(bookingData.checkOut) <= new Date(bookingData.checkIn)) {
        errors.dates = 'Check-out date must be after the check-in date.'
      }
    }
    return errors
  }

  const handleCheckAvailability = () => {
    const errors = validate()
    if (!bookingData.checkIn || !bookingData.checkOut) {
      setFormErrors({ ...errors, dates: 'Please select both check-in and check-out dates.' })
      return
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }
    setFormErrors({})

    const existing = JSON.parse(localStorage.getItem('bookings') || '[]')
    const start = new Date(bookingData.checkIn)
    const end = new Date(bookingData.checkOut)

    const isConflict = existing.some(b => {
      if (b.property !== bookingData.property) return false
      const bStart = new Date(b.checkIn)
      const bEnd = new Date(b.checkOut)
      return start < bEnd && end > bStart
    })

    if (isConflict) {
      setAvailabilityStatus('unavailable')
    } else {
      setAvailabilityStatus('available')
      if (window.confirm("Room is available! Would you like to confirm your booking?")) {
        processBooking()
      }
    }
  }

  const processBooking = () => {
    const existing = JSON.parse(localStorage.getItem('bookings') || '[]')
    const existingIds = existing.map(b => b.id).filter(id => id && id.startsWith('#AMB-'))
    const maxId = existingIds.reduce((max, id) => {
      const num = parseInt(id.replace('#AMB-', ''), 10)
      return num > max ? num : max
    }, 0)
    const newIdString = `#AMB-${String(maxId + 1).padStart(6, '0')}`

    setGeneratedBookingId(newIdString)
    const newBooking = { ...bookingData, id: newIdString, date: new Date().toLocaleDateString(), userEmail: user?.email || '' }
    localStorage.setItem('bookings', JSON.stringify([...existing, newBooking]))
    if (onBookingComplete) onBookingComplete()
    setStep(2)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (availabilityStatus === 'idle') {
      handleCheckAvailability()
      return
    }
    if (availabilityStatus === 'unavailable') {
      return
    }

    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }
    setFormErrors({})

    processBooking()
  }

  const handleCreateAccount = () => { onClose(); if (onOpenLogin) onOpenLogin() }

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(91, 126, 60, 0.1)', backdropFilter: 'blur(8px)' }} />
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="glass" style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', padding: '3rem', borderRadius: '28px', position: 'relative' }}>
            <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', color: '#94a3b8', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            {step === 1 ? (
              <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.2rem' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Reserve Your Stay</h2>

                <div>
                  <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginBottom: '0.3rem', display: 'block' }}>Full Name *</label>
                  <input type="text" value={bookingData.guestName} onChange={e => setBookingData({ ...bookingData, guestName: e.target.value })} required style={fStyle} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginBottom: '0.3rem', display: 'block' }}>Date of Birth *</label>
                    <input type="date" value={bookingData.dob} onChange={e => { setBookingData({ ...bookingData, dob: e.target.value }); setFormErrors(prev => ({ ...prev, dob: undefined })) }} required style={formErrors.dob ? fStyleError : fStyle} />
                    {formErrors.dob && <p style={{ color: '#EA5252', fontSize: '0.78rem', marginTop: '0.4rem', fontWeight: 600, lineHeight: 1.4 }}>⚠ {formErrors.dob}</p>}
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginBottom: '0.3rem', display: 'block' }}>Gender *</label>
                    <select value={bookingData.gender} onChange={e => setBookingData({ ...bookingData, gender: e.target.value })} required style={fStyle}>
                      <option value="" disabled>Select</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginBottom: '0.3rem', display: 'block' }}>No. of Guests *</label>
                    <input type="number" min="1" value={bookingData.guests} onChange={e => setBookingData({ ...bookingData, guests: e.target.value })} required style={fStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginBottom: '0.3rem', display: 'block' }}>Mobile Number *</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <select value={bookingData.countryCode} onChange={e => setBookingData({ ...bookingData, countryCode: e.target.value })} style={{ ...fStyle, width: '85px', padding: '0 0.4rem', fontSize: '0.9rem' }}>
                        {countryCodes.map(code => <option key={code} value={code}>{code}</option>)}
                      </select>
                      <input type="tel" value={bookingData.mobile} onChange={e => setBookingData({ ...bookingData, mobile: e.target.value.replace(/\D/g, '') })} required style={{ ...fStyle, flex: 1 }} />
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginBottom: '0.3rem', display: 'block' }}>Property *</label>
                  <select value={bookingData.property} onChange={e => setBookingData({ ...bookingData, property: e.target.value })} required style={fStyle}>
                    {propertyTypes.map((pt, i) => <option key={i} value={pt}>{pt}</option>)}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div><label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginBottom: '0.3rem', display: 'block' }}>Check-in *</label><input type="date" value={bookingData.checkIn} onChange={e => { setBookingData({ ...bookingData, checkIn: e.target.value }); setFormErrors(prev => ({ ...prev, dates: undefined })) }} required style={formErrors.dates ? fStyleError : fStyle} /></div>
                  <div><label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginBottom: '0.3rem', display: 'block' }}>Check-out *</label><input type="date" value={bookingData.checkOut} onChange={e => { setBookingData({ ...bookingData, checkOut: e.target.value }); setFormErrors(prev => ({ ...prev, dates: undefined })) }} required style={formErrors.dates ? fStyleError : fStyle} /></div>
                </div>
                {formErrors.dates && (
                  <div style={{ background: '#fff1f2', border: '2px solid #fda4af', borderRadius: '12px', padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>📅</span>
                    <p style={{ color: '#e11d48', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>{formErrors.dates}</p>
                  </div>
                )}
                {availabilityStatus === 'unavailable' && (
                  <div style={{ background: '#fff1f2', border: '2px solid #fda4af', borderRadius: '12px', padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>⚠</span>
                    <p style={{ color: '#e11d48', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>Sorry, the selected property is not available for these dates.</p>
                  </div>
                )}
                {availabilityStatus === 'available' && (
                  <div style={{ background: '#f0fdf4', border: '2px solid #bbf7d0', borderRadius: '12px', padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>✨</span>
                    <p style={{ color: '#16a34a', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>Room is available! Would you like to confirm your booking?</p>
                  </div>
                )}
                {availabilityStatus === 'available' ? (
                  <button type="submit" className="btn-booking" style={{ height: '56px', fontSize: '1.05rem', width: '100%' }}>Confirm Booking</button>
                ) : (
                  <button type="button" onClick={handleCheckAvailability} className="btn-primary" style={{ height: '56px', fontSize: '1.05rem', width: '100%', borderRadius: '14px' }}>Check Availability</button>
                )}
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <CheckCircle2 size={70} color="#5B7E3C" style={{ marginBottom: '1rem' }} />
                <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Booking Confirmed!</h2>

                <div style={{ margin: '1.5rem 0', padding: '1.5rem', background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '16px' }}>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Your Booking ID</p>
                  <p style={{ fontSize: '2.2rem', color: '#0f172a', fontWeight: 800, margin: 0, letterSpacing: '2px' }}>{generatedBookingId}</p>
                </div>

                <p style={{ color: '#64748b', margin: '0.8rem 0', lineHeight: 1.6, fontSize: '1.05rem' }}>We are absolutely thrilled to host you! Please keep your Booking ID handy when you arrive for a smooth and seamless check-in experience.</p>

                <div style={{ background: 'var(--background)', padding: '1.5rem', borderRadius: '16px', marginTop: '1.5rem' }}>
                  <p style={{ color: '#64748b', margin: '0 0 0.5rem 0' }}>Your stay at <strong style={{ color: '#5B7E3C', fontSize: '1.1rem' }}>{bookingData.property}</strong></p>
                  <p style={{ color: '#1e293b', fontSize: '1rem', fontWeight: 600, margin: 0 }}>{formatDate(bookingData.checkIn)} to {formatDate(bookingData.checkOut)}</p>
                </div>

                {!user && (
                  <div style={{ background: 'linear-gradient(135deg, #f0f9eb, #fff7ed)', border: '2px solid #bbf7d0', borderRadius: '20px', padding: '1.8rem', marginTop: '1.5rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '1.5rem', margin: '0 0 0.5rem' }}>🌿</p>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>Welcome to Snehanir!</h3>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1rem' }}>Create a free account to manage your bookings, receive updates, and enjoy a personalised experience.</p>
                    <button onClick={handleCreateAccount} className="btn-primary" style={{ padding: '0.8rem 2rem', fontSize: '0.95rem' }}>Create Account</button>
                  </div>
                )}
                <button onClick={onClose} style={{ width: '100%', marginTop: '1.2rem', padding: '0.8rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: 700, color: '#64748b', cursor: 'pointer' }}>{user ? 'Back Home' : 'Maybe Later'}</button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}


const MyBookingsModal = ({ isOpen, onClose, user }) => {
  const [localBookings, setLocalBookings] = useState([]); const [confirmCancelId, setConfirmCancelId] = useState(null)
  useEffect(() => { if (isOpen) { const allBookings = JSON.parse(localStorage.getItem('bookings') || '[]'); setLocalBookings(user ? allBookings.filter(b => b.userEmail === user.email) : []) } }, [isOpen, user])
  const handleCancel = (id) => { const allBookings = JSON.parse(localStorage.getItem('bookings') || '[]'); const updated = allBookings.filter(b => b.id !== id); localStorage.setItem('bookings', JSON.stringify(updated)); setLocalBookings(updated.filter(b => b.userEmail === user?.email)); setConfirmCancelId(null) }
  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(91, 126, 60, 0.2)', backdropFilter: 'blur(8px)' }} />
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="glass" style={{ width: '100%', maxWidth: '600px', maxHeight: '80vh', padding: '3rem', borderRadius: '32px', position: 'relative', overflowY: 'auto' }}>
            <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            <h2 style={{ fontSize: '2.2rem', marginBottom: '2rem', fontWeight: 800 }}>My Bookings</h2>
            {localBookings.length === 0 ? <p style={{ textAlign: 'center', color: '#94a3b8' }}>No active bookings.</p> : (
              <div style={{ display: 'grid', gap: '1.5rem' }}>{localBookings.map((b, i) => (
                <div key={i} className="glass" style={{ padding: '2rem', borderRadius: '20px', background: 'var(--background)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}><h3 style={{ fontSize: '1.4rem', color: '#5B7E3C' }}>{b.property}</h3>{confirmCancelId === b.id ? (<div style={{ display: 'flex', gap: '0.5rem' }}><button onClick={() => handleCancel(b.id)} style={{ padding: '0.4rem 0.8rem', background: '#EA5252', color: 'white', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>Confirm</button><button onClick={() => setConfirmCancelId(null)} style={{ padding: '0.4rem 0.8rem', background: '#e2e8f0', color: '#64748b', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>Back</button></div>) : (<button onClick={() => setConfirmCancelId(b.id)} className="btn-cancel" style={{ background: 'none', color: '#EA5252', border: '2px solid #EA5252', borderRadius: '10px', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 700 }}>Cancel Booking</button>)}</div>
                  <p style={{ color: '#64748b', fontWeight: 500 }}>{formatDate(b.checkIn)} to {formatDate(b.checkOut)}</p>
                </div>))}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function App() {
  const [view, setView] = useState('home'); const [user, setUser] = useState(null); const [isBookingOpen, setIsBookingOpen] = useState(false); const [isLoginOpen, setIsLoginOpen] = useState(false); const [isMyBookingsOpen, setIsMyBookingsOpen] = useState(false); const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    // One time wipe of old users to enforce prodkasafar@gmail.com as the only super user
    if (!localStorage.getItem('wiped_old_users')) {
      let currentUsers = JSON.parse(localStorage.getItem('user_accounts') || '[]')
      currentUsers = currentUsers.filter(u => u.email === 'prodkasafar@gmail.com')
      localStorage.setItem('user_accounts', JSON.stringify(currentUsers))
      localStorage.setItem('wiped_old_users', 'true')
    }

    const existingUsers = JSON.parse(localStorage.getItem('user_accounts') || '[]')

    // Seed property types if missing
    if (!localStorage.getItem('property_types')) {
      localStorage.setItem('property_types', JSON.stringify(['Forest Cabin', 'Amber Villa', 'Crimson Lodge']))
    }

    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          const users = JSON.parse(localStorage.getItem('user_accounts') || '[]')
          let currentUser = users.find(u => u.email === firebaseUser.email)
          const isAdmin = firebaseUser.email === 'prodkasafar@gmail.com'
          if (!currentUser) {
            currentUser = { name: firebaseUser.email.split('@')[0], email: firebaseUser.email, role: isAdmin ? 'Administrator' : 'Guest' }
            users.push(currentUser)
            localStorage.setItem('user_accounts', JSON.stringify(users))
          } else if (isAdmin && currentUser.role !== 'Administrator') {
            currentUser.role = 'Administrator'
            localStorage.setItem('user_accounts', JSON.stringify(users))
          }
          setUser(currentUser)
          localStorage.setItem('user', JSON.stringify(currentUser))
        } else {
          setUser(null)
          localStorage.removeItem('user')
        }
      })
      return () => unsubscribe()
    }
  }, [])
  const handleLogin = (userData) => { setUser(userData); localStorage.setItem('user', JSON.stringify(userData)); }
  const handleLogout = async () => {
    if (auth) {
      try {
        await signOut(auth);
      } catch (error) {
        console.error("Error signing out: ", error);
      }
    }
    setUser(null);
    localStorage.removeItem('user');
    setView('home');
  }
  if (view === 'admin') return <AdminDashboard onBack={() => setView('home')} currentUser={user} />
  return (
    <div className="app">
      <Navbar onOpenBooking={() => setIsBookingOpen(true)} onOpenMyBookings={() => setIsMyBookingsOpen(true)} onOpenLogin={() => setIsLoginOpen(true)} onOpenAdmin={() => setView('admin')} onLogout={handleLogout} user={user} />
      <Hero onOpenBooking={() => setIsBookingOpen(true)} />
      <LoginModal key={`login-${isLoginOpen}`} isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} onLogin={handleLogin} />
      <BookingModal isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} onBookingComplete={() => setRefreshKey(k => k + 1)} user={user} onOpenLogin={() => setIsLoginOpen(true)} />
      <MyBookingsModal isOpen={isMyBookingsOpen} onClose={() => setIsMyBookingsOpen(false)} user={user} />
      <section style={{ padding: '6rem 0' }}><div className="container"><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '4rem' }}>{[{ title: "Forest Aura", icon: <Star />, color: '#5B7E3C' }, { title: "Orange Sunset", icon: <Sun />, color: '#FF9D23' }, { title: "Crimson Peak", icon: <CheckCircle2 />, color: '#EA5252' }].map((item, i) => (<motion.div key={i} whileHover={{ y: -15 }} className="glass" style={{ padding: '4rem 3rem', borderRadius: '40px', textAlign: 'center' }}><div style={{ color: item.color, marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>{item.icon}</div><h3 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{item.title}</h3></motion.div>))}</div></div></section>
      <footer style={{ padding: '6rem 0', textAlign: 'center', color: '#94a3b8', borderTop: '1px solid var(--border)' }}><p>© 2026 LuxeStay. Colorful Nature.</p></footer>
    </div>
  )
}

export default App
