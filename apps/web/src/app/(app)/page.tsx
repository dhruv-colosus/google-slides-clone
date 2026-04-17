"use client";

import { useState, useEffect, useRef, MouseEvent } from "react";
import Image from "next/image";
import {
  AppBar,
  Box,
  Divider,
  Fab,
  IconButton,
  InputBase,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Switch,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { UserAvatar } from "@/features/auth";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import AppsRoundedIcon from "@mui/icons-material/AppsRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import SwapVertRoundedIcon from "@mui/icons-material/SwapVertRounded";
import ViewListRoundedIcon from "@mui/icons-material/ViewListRounded";
import SortByAlphaRoundedIcon from "@mui/icons-material/SortByAlphaRounded";
import FolderOpenRoundedIcon from "@mui/icons-material/FolderOpenRounded";
import PeopleRoundedIcon from "@mui/icons-material/PeopleRounded";
import TextFieldsRoundedIcon from "@mui/icons-material/TextFieldsRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";

const SLIDES_YELLOW = "#F9AB00";
const TEXT_PRIMARY = "#202124";
const TEXT_SECONDARY = "#5f6368";
const SURFACE_GREY = "#F0F4F9";
const PAGE_GREY = "#F0F4F9";
const BORDER_GREY = "#dadce0";

const MOCK_DATES = [
  "Jul 30, 2025", "Aug 3, 2025", "Aug 10, 2025", "Aug 14, 2025", "Aug 20, 2025",
  "Sep 1, 2025", "Sep 8, 2025", "Sep 15, 2025", "Oct 2, 2025", "Oct 9, 2025",
];

const placeholders = Array.from({ length: 10 }, (_, index) => ({
  id: index,
  title: "Untitled presentation",
  opened: MOCK_DATES[index],
}));

function PlaceholderThumbnail() {
  return (
    <Box
      sx={{
        width: "100%",
        aspectRatio: "16 / 9",
        bgcolor: "#fff",
        borderBottom: `1px solid ${BORDER_GREY}`,
      }}
    />
  );
}

function PresentationCard({
  title,
  opened,
  highlighted,
  onMenuOpen,
}: {
  title: string;
  opened: string;
  highlighted: boolean;
  onMenuOpen: (event: MouseEvent<HTMLElement>) => void;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: highlighted ? `2px solid ${SLIDES_YELLOW}` : `1px solid ${BORDER_GREY}`,
        borderRadius: "4px",
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color 0.15s ease",
        "&:hover": {
          borderColor: SLIDES_YELLOW,
        },
      }}
    >
      <PlaceholderThumbnail />
      <Box sx={{ px: 2, py: 1.25 }}>
        <Typography
          sx={{
            fontSize: 14,
            fontWeight: 400,
            color: TEXT_PRIMARY,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            mb: 0.5,
          }}
        >
          {title}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box sx={{ width: 16, height: 16, flexShrink: 0 }}>
            <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
              <rect x="0" y="1" width="16" height="11" rx="1.5" fill="#F9AB00" />
              <rect x="2" y="3" width="12" height="7" rx="0.5" fill="#fff" opacity="0.9" />
              <rect x="5" y="12" width="6" height="1.5" fill="#F9AB00" />
              <rect x="4" y="13.5" width="8" height="1" rx="0.5" fill="#F9AB00" />
            </svg>
          </Box>
          <PeopleRoundedIcon sx={{ fontSize: 18, color: TEXT_SECONDARY }} />
          <Typography sx={{ fontSize: 12, color: TEXT_SECONDARY, flex: 1 }}>
            {opened}
          </Typography>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onMenuOpen(e);
            }}
            sx={{ color: TEXT_SECONDARY }}
          >
            <MoreVertRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
}

function BlankPresentationCard() {
  return (
    <Box sx={{ width: 200 }}>
      <Paper
        elevation={0}
        sx={{
          width: 200,
          height: 112,
          border: "1px solid #C4C7C5",
          borderRadius: "4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          bgcolor: "#fff",
          transition: "border-color 0.15s ease, box-shadow 0.15s ease",
          "&:hover": {
            borderColor: SLIDES_YELLOW,
            boxShadow: "0 1px 2px rgba(60,64,67,0.2)",
          },
        }}
      >
        <Box
          sx={{
            position: "relative",
            width: 150,
            aspectRatio: "16 / 9",
          }}
        >
          <Image
            src="/images/slides-blank-googlecolors.png"
            alt="Start a new presentation"
            fill
            sizes="150px"
            priority
            style={{ objectFit: "contain" }}
          />
        </Box>
      </Paper>
      <Typography
        sx={{
          mt: 1,
          fontSize: 14,
          fontWeight: 400,
          color: TEXT_PRIMARY,
        }}
      >
        Blank presentation
      </Typography>
    </Box>
  );
}

function NewPresentationFab({ visible }: { visible: boolean }) {
  return (
    <Box
      sx={{
        position: "fixed",
        bottom: { xs: 20, md: 32 },
        right: { xs: 20, md: 32 },
        zIndex: 1300,
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0.7)",
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 0.2s ease, transform 0.2s ease",
      }}
    >
      <Fab
        aria-label="Start a new presentation"
        sx={{
          bgcolor: "#fff",
          boxShadow: "0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15)",
          "&:hover": { bgcolor: "#f8f9fa" },
        }}
      >
        <AddRoundedIcon sx={{ color: TEXT_SECONDARY }} />
      </Fab>
    </Box>
  );
}

export default function DashboardPage() {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [activeCardId, setActiveCardId] = useState<number | null>(null);
  const [availableOffline, setAvailableOffline] = useState(false);
  const [showFab, setShowFab] = useState(false);
  const [appBarHeight, setAppBarHeight] = useState(68);
  const startSectionRef = useRef<HTMLDivElement | null>(null);
  const appBarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const appBar = appBarRef.current;
    if (!appBar) return;
    const ro = new ResizeObserver(() => setAppBarHeight(appBar.offsetHeight));
    ro.observe(appBar);
    setAppBarHeight(appBar.offsetHeight);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const node = startSectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowFab(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const handleMenuOpen = (id: number) => (event: MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
    setActiveCardId(id);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setActiveCardId(null);
  };

  return (
    <Box sx={{ bgcolor: "#fff", minHeight: "100vh", color: TEXT_PRIMARY }}>
      <AppBar
        ref={appBarRef}
        position="sticky"
        elevation={0}
        sx={{ bgcolor: "#fff", color: TEXT_PRIMARY }}
      >
        <Toolbar
          disableGutters
          sx={{
            gap: 0.5,
            px: 1.5,
            minHeight: "56px !important",
          }}
        >
          <IconButton sx={{ color: TEXT_SECONDARY }}>
            <MenuRoundedIcon />
          </IconButton>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mr: 2 }}>
            <Image
              src="/images/logo.png"
              alt="Slides"
              width={40}
              height={40}
              priority
            />
            <Typography
              sx={{
                fontSize: 22,
                color: "#1F1F1F",
                fontWeight: 200,
                letterSpacing: 0,
                fontFamily: "var(--font-product-sans)",
              }}
            >
              Slides
            </Typography>
          </Box>
          <Paper
            elevation={0}
            sx={{
              flex: 1,
              maxWidth: 720,
              mx: "auto",
              display: "flex",
              alignItems: "center",
              bgcolor: SURFACE_GREY,
              borderRadius: "999px",
              px: 2,
              height: 46,
              my: 1,
              "&:hover": { bgcolor: "#dde3ea" },
              "&:focus-within": {
                bgcolor: "#fff",
                boxShadow:
                  "0 1px 1px 0 rgba(65,69,73,0.3), 0 1px 3px 1px rgba(65,69,73,0.15)",
              },
            }}
          >
            <IconButton size="small" sx={{ color: TEXT_SECONDARY, mr: 1 }}>
              <SearchRoundedIcon />
            </IconButton>
            <InputBase
              placeholder="Search"
              sx={{ flex: 1, fontSize: 16, fontWeight: 300, color: TEXT_PRIMARY, "& input::placeholder": { color: TEXT_SECONDARY, opacity: 1 } }}
            />
          </Paper>
          <IconButton sx={{ color: TEXT_SECONDARY, ml: 1.5 }}>
            <AppsRoundedIcon />
          </IconButton>
          <UserAvatar size={32} />
        </Toolbar>
      </AppBar>

      <Box ref={startSectionRef} sx={{ bgcolor: PAGE_GREY, py: 3 }}>
        <Box sx={{ maxWidth: "80%", mx: "auto", px: { xs: 2, md: 6 } }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Typography
              sx={{ fontSize: 16, fontWeight: 300, color: TEXT_PRIMARY, flex: 1 }}
            >
              Start a new presentation
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography sx={{ fontSize: 14, color: TEXT_SECONDARY }}>
                Template gallery
              </Typography>
              <IconButton size="small" sx={{ color: TEXT_SECONDARY }}>
                <SwapVertRoundedIcon fontSize="small" />
              </IconButton>
              <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 0.5 }} />
              <IconButton size="small" sx={{ color: TEXT_SECONDARY }}>
                <MoreVertRoundedIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 3 }}>
            <BlankPresentationCard />
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          position: "sticky",
          top: appBarHeight,
          zIndex: 1100,
          bgcolor: "#fff",
          boxShadow: showFab
            ? "0 2px 4px 0 rgba(60,64,67,0.12)"
            : "none",
          transition: "box-shadow 0.2s ease",
        }}
      >
        <Box sx={{ maxWidth: "80%", mx: "auto", px: { xs: 2, md: 6 } }}>
          <Box sx={{ display: "flex", alignItems: "center", py: 1.5 }}>
            <Typography
              sx={{ fontSize: 16, fontWeight: 300, color: TEXT_PRIMARY, flex: 1 }}
            >
              Recent presentations
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mr: 1 }}>
                <Typography sx={{ fontSize: 14, color: TEXT_SECONDARY }}>
                  Owned by anyone
                </Typography>
                <KeyboardArrowDownRoundedIcon
                  sx={{ fontSize: 20, color: TEXT_SECONDARY }}
                />
              </Box>
              <Tooltip title="List view">
                <IconButton size="small" sx={{ color: TEXT_SECONDARY }}>
                  <ViewListRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Sort">
                <IconButton size="small" sx={{ color: TEXT_SECONDARY }}>
                  <SortByAlphaRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Open file picker">
                <IconButton size="small" sx={{ color: TEXT_SECONDARY }}>
                  <FolderOpenRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ bgcolor: "#fff", py: 3 }}>
        <Box sx={{ maxWidth: "80%", mx: "auto", px: { xs: 2, md: 6 } }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(1, 1fr)",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
                lg: "repeat(4, 1fr)",
              },
              gap: 2.5,
            }}
          >
            {placeholders.map((p) => (
              <PresentationCard
                key={p.id}
                title={p.title}
                opened={p.opened}
                highlighted={activeCardId === p.id}
                onMenuOpen={handleMenuOpen(p.id)}
              />
            ))}
          </Box>
        </Box>
      </Box>

      <NewPresentationFab visible={showFab} />

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            elevation: 3,
            sx: {
              minWidth: 280,
              borderRadius: "8px",
              mt: 0.5,
              "& .MuiMenuItem-root": {
                fontSize: 14,
                color: TEXT_PRIMARY,
                py: 1.25,
              },
              "& .MuiListItemIcon-root": {
                color: TEXT_SECONDARY,
                minWidth: 40,
              },
            },
          },
        }}
      >
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <TextFieldsRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Rename</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Remove</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <OpenInNewRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Open in new tab</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            setAvailableOffline((v) => !v);
          }}
          sx={{ display: "flex", alignItems: "center" }}
        >
          <ListItemIcon>
            <CheckCircleOutlineRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Available offline</ListItemText>
          <Switch
            size="small"
            checked={availableOffline}
            onChange={(e) => setAvailableOffline(e.target.checked)}
            onClick={(e) => e.stopPropagation()}
          />
        </MenuItem>
      </Menu>
    </Box>
  );
}
