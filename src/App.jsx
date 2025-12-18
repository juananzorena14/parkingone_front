import { Outlet, NavLink } from 'react-router-dom'
import Navbar from './components/Navbar'


export default function App(){
return (
<div className="min-h-screen">
<Navbar/>
<main className="max-w-6xl mx-auto p-4">
<Outlet/>
</main>
</div>
)
}