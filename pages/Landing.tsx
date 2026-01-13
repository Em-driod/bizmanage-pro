
import React from 'react';
import { Link } from 'react-router-dom';

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Top Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                <div className="w-3 h-3 bg-white rotate-45"></div>
              </div>
              <span className="text-lg font-extrabold tracking-tighter text-slate-900">BIZMANAGE</span>
            </Link>
            <div className="hidden lg:flex items-center gap-6">
              {['Product', 'Solutions', 'Resources', 'Pricing'].map((item) => (
                <a key={item} href="#" className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">{item}</a>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-bold text-slate-600 px-4 py-2 hover:text-slate-900 transition-colors">Sign in</Link>
            <Link to="/register" className="bg-slate-900 text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-44 pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                v4.0 is now live
              </div>
              <h1 className="text-5xl md:text-6xl font-[800] text-slate-900 leading-[1.1] mb-8 text-balance">
                The operating system for modern business.
              </h1>
              <p className="text-lg text-slate-500 mb-10 leading-relaxed font-medium">
                Streamline your back-office operations with a suite of tools designed for precision. Track finances, manage teams, and handle clients in one unified interface.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/register" className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-center hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">
                  Start your 14-day trial
                </Link>
                <button className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl font-bold hover:bg-slate-50 transition-all">
                  Contact Sales
                </button>
              </div>
              <div className="mt-12 flex items-center gap-4 text-sm text-slate-400 font-medium">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200"></div>
                  ))}
                </div>
                <span>Trusted by over 1,200 firms</span>
              </div>
            </div>

            <div className="relative">
              {/* This is the professional mock app window */}
              <div className="bg-slate-900 rounded-[2.5rem] p-3 shadow-[0_50px_100px_-20px_rgba(15,23,42,0.15)] rotate-2 scale-105 hidden lg:block">
                <div className="bg-white rounded-[2rem] h-[520px] overflow-hidden border border-slate-800/10 flex">
                  
                  {/* Mock Sidebar */}
                  <div className="w-20 bg-slate-50 border-r border-slate-100 flex flex-col items-center py-6 gap-6">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center mb-4">
                      <div className="w-3 h-3 bg-white rotate-45"></div>
                    </div>
                    {['fa-grid-2', 'fa-users', 'fa-receipt', 'fa-wallet', 'fa-gear'].map((icon, i) => (
                      <div key={i} className={`w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 ${i === 0 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : ''}`}>
                        <i className={`fas ${icon} text-sm`}></i>
                      </div>
                    ))}
                  </div>

                  <div className="flex-1 flex flex-col">
                    {/* Mock Header */}
                    <div className="h-16 border-b border-slate-100 px-8 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-48 h-8 bg-slate-50 rounded-lg flex items-center px-3 gap-2">
                          <i className="fas fa-search text-[10px] text-slate-300"></i>
                          <div className="w-20 h-1.5 bg-slate-200 rounded-full"></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-slate-100"></div>
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100"></div>
                      </div>
                    </div>

                    {/* Mock Content Body */}
                    <div className="p-8 space-y-8 overflow-hidden">
                      {/* Top Metric Cards */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Revenue</p>
                            <span className="text-[9px] font-bold text-emerald-500">+12.5%</span>
                          </div>
                          <p className="text-2xl font-black text-slate-900">$48,290</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Active Clients</p>
                            <span className="text-[9px] font-bold text-indigo-500">Synced</span>
                          </div>
                          <p className="text-2xl font-black text-slate-900">1,204</p>
                        </div>
                      </div>

                      {/* Mini List / Table */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-extrabold text-slate-900 uppercase tracking-widest">Recent Activity</p>
                          <p className="text-[9px] font-bold text-indigo-600">View All</p>
                        </div>
                        <div className="space-y-2">
                          {[
                            { name: 'Acme Corp', amount: '+$2,400', status: 'Paid', color: 'bg-emerald-500' },
                            { name: 'Global Tech', amount: '-$150', status: 'Review', color: 'bg-amber-500' },
                            { name: 'Riverside Inc', amount: '+$8,100', status: 'Paid', color: 'bg-emerald-500' },
                            { name: 'Studio Design', amount: '+$400', status: 'Pending', color: 'bg-slate-300' },
                          ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-3.5 bg-slate-50/50 rounded-xl border border-slate-100 group transition-all hover:bg-white hover:shadow-md hover:shadow-slate-100">
                               <div className="flex items-center gap-3">
                                 <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] ${item.color}`}>
                                   {item.name.charAt(0)}
                                 </div>
                                 <div>
                                   <p className="text-[11px] font-bold text-slate-900">{item.name}</p>
                                   <p className="text-[9px] text-slate-400 font-medium">Invoice #10{i+1}</p>
                                 </div>
                               </div>
                               <div className="text-right">
                                 <p className={`text-[11px] font-bold ${item.amount.startsWith('+') ? 'text-emerald-600' : 'text-slate-900'}`}>{item.amount}</p>
                                 <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-tighter">{item.status}</p>
                               </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Mini Graph Footer */}
                      <div className="pt-4 border-t border-slate-50 flex items-end justify-between h-16 px-2">
                        {[40, 65, 30, 80, 45, 90, 60, 75, 50, 85].map((h, i) => (
                          <div key={i} className="w-2.5 bg-slate-100 rounded-t-sm transition-all hover:bg-indigo-600" style={{ height: `${h}%` }}></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Trust Section */}
      <section className="py-24 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-12">Powering industry leaders</p>
          <div className="flex flex-wrap justify-center items-center gap-x-20 gap-y-12 opacity-40 grayscale">
            {['VERITAS', 'STRATUM', 'APEX', 'LUMINA', 'NEXUS'].map(brand => (
              <span key={brand} className="text-2xl font-black tracking-tighter text-slate-900">{brand}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="py-32 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-20">
            <h2 className="text-4xl font-[800] text-slate-900 mb-6 tracking-tight">Everything you need to scale.</h2>
            <p className="text-lg text-slate-500 font-medium">A modular system built to grow with your ambition, from solo founder to enterprise team.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bento-card bg-white rounded-[2rem] border border-slate-100 p-10 overflow-hidden relative group">
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-4">Financial Transparency</h3>
                <p className="text-slate-500 max-w-sm mb-12">Automated transaction tracking and real-time revenue analytics that keep your books perfect.</p>
                <div className="flex gap-2">
                  <div className="w-32 h-40 bg-slate-50 rounded-2xl border border-slate-100 p-4 flex flex-col justify-between">
                     <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                       <i className="fas fa-arrow-up text-emerald-600 text-xs"></i>
                     </div>
                     <div className="h-2 w-full bg-slate-200 rounded-full"></div>
                  </div>
                  <div className="w-32 h-40 bg-indigo-600 rounded-2xl p-4 flex flex-col justify-between">
                     <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
                       <i className="fas fa-check text-xs"></i>
                     </div>
                     <div className="h-2 w-full bg-white/30 rounded-full"></div>
                  </div>
                </div>
              </div>
              <div className="absolute right-[-10%] bottom-[-10%] w-2/3 h-2/3 bg-indigo-50/50 rounded-full blur-[100px] group-hover:bg-indigo-100 transition-colors"></div>
            </div>

            <div className="bento-card bg-slate-900 rounded-[2rem] p-10 text-white relative overflow-hidden">
               <div className="relative z-10">
                 <h3 className="text-2xl font-bold mb-4">Global Search</h3>
                 <p className="text-slate-400 text-sm mb-12">Find any client or invoice in milliseconds with our indexed engine.</p>
                 <div className="bg-white/10 p-3 rounded-xl border border-white/10 flex items-center gap-3">
                   <i className="fas fa-search text-xs text-slate-400"></i>
                   <div className="w-24 h-2 bg-white/20 rounded-full"></div>
                 </div>
               </div>
               <div className="absolute top-0 right-0 p-8">
                 <i className="fas fa-bolt text-indigo-400 text-4xl opacity-20"></i>
               </div>
            </div>

            <div className="bento-card bg-white rounded-[2rem] border border-slate-100 p-10">
               <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                 <i className="fas fa-users"></i>
               </div>
               <h3 className="text-xl font-bold mb-3">Team Management</h3>
               <p className="text-slate-500 text-sm leading-relaxed font-medium">Assign roles, monitor payroll, and coordinate staff with enterprise-grade permission controls.</p>
            </div>

            <div className="md:col-span-2 bento-card bg-white rounded-[2rem] border border-slate-100 p-10 flex flex-col md:flex-row gap-12 items-center">
               <div className="flex-1">
                 <h3 className="text-2xl font-bold mb-4">Instant Reporting</h3>
                 <p className="text-slate-500 mb-6">Generate tax-ready reports and performance insights with a single click. No more spreadsheets.</p>
                 <button className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-2">
                   View Sample Reports <i className="fas fa-chevron-right text-[10px]"></i>
                 </button>
               </div>
               <div className="w-full md:w-1/2 flex items-end gap-2 h-32">
                 {[40, 70, 45, 90, 65, 85].map((h, i) => (
                   <div key={i} className="flex-1 bg-slate-100 rounded-t-lg transition-all hover:bg-indigo-500" style={{ height: `${h}%` }}></div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-white text-center px-6">
        <div className="max-w-3xl mx-auto bg-slate-900 rounded-[3rem] p-16 relative overflow-hidden shadow-2xl shadow-indigo-100">
           <div className="relative z-10">
             <h2 className="text-4xl font-bold text-white mb-6 tracking-tight">Ready to streamline?</h2>
             <p className="text-slate-400 mb-10 font-medium">Join over 1,000 businesses making better decisions every day.</p>
             <Link to="/register" className="inline-block px-10 py-5 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-500/20">
               Create your account
             </Link>
           </div>
           <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/10 to-transparent"></div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                <div className="w-3 h-3 bg-white rotate-45"></div>
              </div>
              <span className="text-lg font-extrabold tracking-tighter text-slate-900">BIZMANAGE</span>
            </div>
            <p className="text-slate-400 text-sm max-w-xs leading-relaxed font-medium">
              Enterprise business management for teams that value clarity and performance.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-sm uppercase tracking-widest text-slate-400">Platform</h4>
            <ul className="space-y-4 text-sm font-semibold text-slate-600">
              <li><a href="#" className="hover:text-slate-900 transition-colors">Analytics</a></li>
              <li><a href="#" className="hover:text-slate-900 transition-colors">Payroll</a></li>
              <li><a href="#" className="hover:text-slate-900 transition-colors">CRM</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-sm uppercase tracking-widest text-slate-400">Company</h4>
            <ul className="space-y-4 text-sm font-semibold text-slate-600">
              <li><a href="#" className="hover:text-slate-900 transition-colors">About</a></li>
              <li><a href="#" className="hover:text-slate-900 transition-colors">Customers</a></li>
              <li><a href="#" className="hover:text-slate-900 transition-colors">Careers</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-sm uppercase tracking-widest text-slate-400">Support</h4>
            <ul className="space-y-4 text-sm font-semibold text-slate-600">
              <li><a href="#" className="hover:text-slate-900 transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-slate-900 transition-colors">API Docs</a></li>
              <li><a href="#" className="hover:text-slate-900 transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 pt-20 mt-20 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8">
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">© 2025 BizManage Pro Inc.</p>
           <div className="flex gap-8">
              <a href="#" className="text-slate-400 hover:text-slate-900 transition-colors"><i className="fab fa-twitter"></i></a>
              <a href="#" className="text-slate-400 hover:text-slate-900 transition-colors"><i className="fab fa-linkedin"></i></a>
              <a href="#" className="text-slate-400 hover:text-slate-900 transition-colors"><i className="fab fa-github"></i></a>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
