import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Star, Trash2, FileText, Search, Folder } from "lucide-react";
import { database } from "@/firebase";
import { ref as dbRef, onValue, update, remove } from "firebase/database";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const Categories = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const categoriesRef = dbRef(database, "Category");
    onValue(categoriesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const sortedCategories = Object.keys(data)
          .map((key) => ({
            IdCategory: key,
            ...data[key],
          }))
          .sort((a, b) => (a.Name || "").localeCompare(b.Name || "", "es", { sensitivity: "base" }));
        setCategories(sortedCategories);
      } else {
        setCategories([]);
      }
    });
  }, []);

  const handleDeleteCategory = (category) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar ${category.Name}?`)) {
      const categoryRef = dbRef(database, `Category/${category.IdCategory}`);
      remove(categoryRef);
    }
  };

  const handleToggleFeatured = (category) => {
    const categoryRef = dbRef(database, `Category/${category.IdCategory}`);
    update(categoryRef, { IsFeatured: !category.IsFeatured });
  };

  const filteredCategories = useMemo(() => {
    return categories
      .filter((category) => {
        const matchesSearch =
          (category.Name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (category.Description &&
            category.Description.toLowerCase().includes(searchTerm.toLowerCase()));
        if (activeTab === "all") return matchesSearch;
        if (activeTab === "featured") return matchesSearch && category.IsFeatured;
        return false;
      })
      .sort((a, b) =>
        (a.Name || "").localeCompare(b.Name || "", "es", { sensitivity: "base" })
      );
  }, [categories, searchTerm, activeTab]);

  const goToEdit = (category) => {
    navigate(`/categorias/${category.IdCategory}/editar`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categorías</h1>
          <p className="text-muted-foreground">Gestione sus categorías de productos.</p>
        </div>
        <Button className="sm:self-start" onClick={() => navigate("/categorias/nuevo")}>
          <Plus size={16} className="mr-2" /> Agregar categoría
        </Button>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-3 sm:p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[auto,1fr] md:items-end">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Estado</Label>
              <Tabs
                defaultValue="all"
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 sm:w-auto">
                  <TabsTrigger value="all">Todas</TabsTrigger>
                  <TabsTrigger value="featured">Destacadas</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="space-y-1">
              <Label htmlFor="categories-search" className="text-xs text-muted-foreground">
                Buscador general
              </Label>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                  size={16}
                />
                <Input
                  id="categories-search"
                  placeholder="Buscar por nombre o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {filteredCategories.length > 0 ? (
          <div className="border rounded-lg overflow-hidden divide-y">
            {filteredCategories.map((category) => (
              <CategoryListRow
                key={category.IdCategory}
                category={category}
                categories={categories}
                onEdit={() => goToEdit(category)}
                onDelete={handleDeleteCategory}
                onToggleFeatured={handleToggleFeatured}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-lg font-medium">No se encontraron categorías</h3>
            <p className="mt-1 text-muted-foreground">
              {searchTerm
                ? "Intenta ajustar tu término de búsqueda."
                : "Comienza agregando una nueva categoría."}
            </p>
            <Button className="mt-4" onClick={() => navigate("/categorias/nuevo")}>
              <Plus size={16} className="mr-2" /> Agregar categoría
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

const CategoryListRow = ({ category, categories, onEdit, onDelete, onToggleFeatured }) => {
  const parentName = category.ParentCategoryId
    ? categories.find((c) => c.IdCategory === category.ParentCategoryId)?.Name
    : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-3 px-3 py-2.5 bg-card hover:bg-muted/40 transition-colors cursor-pointer"
      onClick={() => onEdit()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit();
        }
      }}
    >
      <div className="w-12 h-12 shrink-0 rounded-md overflow-hidden bg-muted border flex items-center justify-center text-muted-foreground">
        <Folder size={18} />
      </div>

      <div className="flex-1 min-w-0 overflow-hidden">
        <p className="text-sm font-medium truncate">{category.Name}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {parentName ? (
            <span className="text-xs text-muted-foreground truncate">Bajo: {parentName}</span>
          ) : (
            <span className="text-xs text-muted-foreground">Raíz</span>
          )}
          {category.Description ? (
            <>
              <span className="text-muted-foreground/40 text-xs hidden sm:inline">·</span>
              <span className="text-xs text-muted-foreground truncate hidden sm:inline max-w-[min(100%,28rem)]">
                {category.Description}
              </span>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        {(category.IsFeatured || category.IsSuperCategory) && (
          <div className="flex flex-wrap justify-end gap-1">
            {category.IsFeatured && (
              <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">
                Destacada
              </Badge>
            )}
            {category.IsSuperCategory && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                Supercategoría
              </Badge>
            )}
          </div>
        )}
        <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-3 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          Editar
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className={`h-8 w-8 ${category.IsFeatured ? "text-amber-500" : "text-muted-foreground"}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFeatured(category);
          }}
          title={category.IsFeatured ? "Quitar destacado" : "Destacar"}
        >
          <Star size={14} className={category.IsFeatured ? "fill-amber-500" : ""} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(category);
          }}
          title="Eliminar"
        >
          <Trash2 size={14} />
        </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default Categories;
