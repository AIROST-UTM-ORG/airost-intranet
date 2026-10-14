import React from 'react';
import * as faicon from 'react-icons/fa';
import * as aiicon from 'react-icons/ai';
import * as cgicon from "react-icons/cg";
import { MdSpaceDashboard } from "react-icons/md";


export const Sidebar = [
  {
    title: 'Dashboard',
    path: '/',
    icon: <MdSpaceDashboard />,
    cName: 'side-text',
    hideNavItem: false,
  },
   {
    title: 'Members',
    path: '/members',
    icon: <cgicon.CgProfile />,
    cName: 'side-text',
    hideNavItem: false,
  },
  {
    title: 'Projects',
    path: '/projects',
    icon: <aiicon.AiFillProject />,
    cName: 'side-text',
    hideNavItem: false,
  },
  {
    title: 'Project Tracking',
    path: '/projects/tracking',
    icon: <faicon.FaChartLine/>,
    cName: 'side-text',
    hideNavItem: false,
  },
  {
    title: 'Events',
    path: '/events',
    icon: <aiicon.AiFillCalendar />,
    cName: 'side-text',
    hideNavItem: true,
  },
  {
    title: 'Documentation',
    path: '/doc',
    icon: <faicon.FaFilePdf />,
    cName: 'side-text',
    hideNavItem: true,
  },
];