import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  DollarSign,
  FileText,
  ArrowUpDown,
  CheckCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { database } from "@/firebase";
import { ref as dbRef, get, onValue, push, update } from "firebase/database";

const BulkPriceUpdateForm = ({ onSubmit, onCancel, isSaving = false }) => {
  const [percentage, setPercentage] = useState("");
  const [categories, setCategories] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);

  // Cargar categorías desde Firebase
  useEffect(() => {
    const categoriesRef = dbRef(database, "Category");
    onValue(categoriesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const categoryList = Object.keys(data).map((key) => ({
          id: key,
          name: data[key].Name,
        }));
        setAvailableCategories(categoryList);
      } else {
        setAvailableCategories([]);
      }
    });
  }, []);

  const handleCategoryToggle = (categoryId) => {
    if (categories.includes(categoryId)) {
      setCategories(categories.filter((id) => id !== categoryId));
    } else {
      setCategories([...categories, categoryId]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      percentage: parseFloat(percentage),
      categories,
      date: new Date().toISOString(),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="bg-card rounded-lg shadow-lg border overflow-hidden"
    >
      <div className="p-6">
        <h3 className="text-lg font-medium mb-4">Actualización de precios</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="percentage">Cambio porcentual (%)</Label>
            <div className="flex">
              <Input
                id="percentage"
                type="number"
                step="0.01"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                className="flex-1"
                placeholder="Ej. 5 para un aumento del 5%, -5 para una disminución del 5%"
                required
              />
              <span className="flex items-center justify-center px-4 border border-l-0 rounded-r-md bg-muted">
                %
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Introduzca un valor positivo para aumentar los precios o negativo para disminuirlos.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Aplicar a categorías (opcional)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {availableCategories.map((category) => (
                <div
                  key={category.id}
                  onClick={() => handleCategoryToggle(category.id)}
                  className={`flex items-center p-3 border rounded-md cursor-pointer transition-colors ${categories.includes(category.id)
                    ? "border-primary bg-primary/5"
                    : "hover:border-muted-foreground/30"
                    }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center mr-2 ${categories.includes(category.id)
                      ? "border-primary text-primary"
                      : "border-muted-foreground/50"
                      }`}
                  >
                    {categories.includes(category.id) && <CheckCircle size={14} />}
                  </div>
                  <span className="text-sm">{category.name}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Deje esta sección en blanco para aplicar a todos los productos.
            </p>
          </div>
          <div className="bg-amber-50 p-3 rounded-md border border-amber-200 text-amber-800 mt-4">
            <h4 className="text-sm font-medium flex items-center">
              <DollarSign size={16} className="mr-1" /> Advertencia de actualización de precios
            </h4>
            <p className="text-xs mt-1">
              Esta acción actualizará los precios de{" "}
              {categories.length > 0
                ? `productos en ${categories.length} categorías seleccionadas`
                : "todos los productos"}.
              Esto no se puede revertir automáticamente.
            </p>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Actualizando..." : "Actualizar precios"}
            </Button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

const PriceHistoryCard = ({ history, index }) => {
  const [categories, setCategories] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);

  useEffect(() => {
    const categoriesRef = dbRef(database, "Category");
    onValue(categoriesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const categoryList = Object.keys(data).map((key) => ({
          id: key,
          name: data[key].Name,
        }));
        setAvailableCategories(categoryList);
      } else {
        setAvailableCategories([]);
      }
    });
  }, []);

  const formattedDate = new Date(history.date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="card-transition"
    >
      <Card className="h-full border overflow-hidden">
        <CardHeader className="p-4">
          <div className="flex items-start gap-2">
            <div
              className={`p-2 rounded-full ${history.percentage >= 0
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-700"
                }`}
            >
              <ArrowUpDown size={18} />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base flex items-center">
                <span
                  className={`${history.percentage >= 0
                    ? "text-emerald-600"
                    : "text-red-600"
                    }`}
                >
                  {history.percentage >= 0 ? "+" : ""}
                  {history.percentage}%
                </span>
              </CardTitle>
              <CardDescription className="text-xs">{formattedDate}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="mt-2 text-sm">
            {history.categories.length > 0 ? (
              <span>
                Aplicado a las siguientes categorías:{" "}
                {history.categories.map((categoryId, index) => {
                  const category = availableCategories.find(cat => cat.id === categoryId);
                  return category ? (
                    <span key={categoryId}>
                      {category.name}
                      {index < history.categories.length - 1 && ", "}
                    </span>
                  ) : null;
                })}
              </span>
            ) : (
              <span>Se aplica a todos los productos.</span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const PriceUpdates = () => {
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("bulk");
  const [priceHistory, setPriceHistory] = useState([]);

  // Cargar historial de actualizaciones desde Firebase
  useEffect(() => {
    const priceHistoryRef = dbRef(database, "PriceUpdates");
    onValue(priceHistoryRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const historyList = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        setPriceHistory(historyList.reverse());
      } else {
        setPriceHistory([]);
      }
    });
  }, []);

  const handleBulkUpdate = async (updateData) => {
    setIsSaving(true);
    try {
      // Referencia a los productos en Firebase
      const productsRef = dbRef(database, "Product");
      const snapshot = await get(productsRef);
      if (!snapshot.exists()) {
        toast.error("No hay productos disponibles para actualizar.");
        return;
      }
      const products = snapshot.val();
      const updatedProducts = {};

      // Iterar sobre los productos y aplicar el cambio de precio
      Object.keys(products).forEach((productId) => {
        const product = products[productId];

        // Validar que product.IdCategory exista y Price sea un número
        if (
          updateData.categories.length === 0 ||
          updateData.categories.includes(product.IdCategory)
        ) {
          // Asegurarse de que product.Price sea un número
          const originalPrice = parseFloat(product.Price);
          if (isNaN(originalPrice)) {
            console.warn(`Precio inválido en producto ${productId}:`, product.Price);
            return; // Opcional: omitir este producto si el precio no es válido
          }

          const newPrice = originalPrice + (originalPrice * updateData.percentage) / 100;
          updatedProducts[productId] = {
            ...product,
            Price: parseFloat(newPrice.toFixed(2)), // Redondear a 2 decimales
          };
        }
      });

      // Guardar los productos actualizados en Firebase
      await update(productsRef, updatedProducts);

      // Guardar el registro de la actualización en PriceUpdates
      const updatesRef = push(dbRef(database, "PriceUpdates"));
      await update(updatesRef, updateData);

      // Actualizar el estado local del historial
      setPriceHistory([
        {
          id: updatesRef.key,
          ...updateData,
        },
        ...priceHistory,
      ]);

      setIsUpdatingPrices(false);
      toast.success("Precios actualizados exitosamente.", {
        classNames: {
          toast: "!bg-emerald-600 !text-white !border-emerald-700",
          title: "!text-white",
          description: "!text-emerald-50",
        },
      });
    } catch (error) {
      console.error("Error al actualizar los precios:", error);
      toast.error("Error al actualizar los precios. Por favor, inténtelo de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Actualizaciones de precios
          </h1>
          <p className="text-muted-foreground">
            Actualice los precios de los productos de forma masiva.
          </p>
        </div>
      </div>
      <Tabs defaultValue="bulk" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="bulk">Actualización masiva</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>
        <TabsContent value="bulk" className="mt-4">
          {isUpdatingPrices ? (
            <BulkPriceUpdateForm
              onSubmit={handleBulkUpdate}
              onCancel={() => !isSaving && setIsUpdatingPrices(false)}
              isSaving={isSaving}
            />
          ) : (
            <div className="text-center py-12 bg-card border rounded-lg">
              <DollarSign className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-lg font-medium">
                Actualizaciones de precios
              </h3>
              <p className="mt-1 text-muted-foreground max-w-md mx-auto">
                Actualice los precios de varios productos a la vez aplicando un
                cambio porcentual.
              </p>
              <Button
                className="mt-4"
                onClick={() => setIsUpdatingPrices(true)}
              >
                <Plus size={16} className="mr-2" /> Iniciar actualización masiva
              </Button>
            </div>
          )}
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          {priceHistory.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {priceHistory.map((history, index) => (
                <PriceHistoryCard key={history.id} history={history} index={index} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-card border rounded-lg">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-lg font-medium">
                Aún no hay actualizaciones de precios
              </h3>
              <p className="mt-1 text-muted-foreground">
                Su historial de actualización de precios aparecerá aquí.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PriceUpdates;