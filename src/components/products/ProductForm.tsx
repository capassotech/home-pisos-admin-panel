import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ref as dbRef, onValue } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { database, storage } from "@/firebase";

interface ProductFormProps {
  product?: any;
  onSave: (productData: any) => void | Promise<void>;
  onCancel: () => void;
  title?: string;
  submitLabel?: string;
}

const NUMERIC_FIELDS = new Set(["Price", "M2PerBox", "UnitsPerBox"]);

const EMPTY_FORM = {
  Name: "",
  Description: "",
  Price: 0 as number,
  PriceType: "",
  M2PerBox: "" as number | "",
  UnitsPerBox: "" as number | "",
  IdCategory: "",
  IsFeatured: false,
  Size: "",
  ImageUrls: [] as string[],
  RequiresQuote: false,
};

/**
 * Convierte precio/cantidad a número finito para persistencia y consumo por pasarelas (p. ej. Mercado Pago).
 * Los inputs HTML devuelven string; Firebase puede tener datos legados como string.
 * Mercado Pago rechaza la preferencia si `unit_price` no es estrictamente Number, por eso forzamos coerción acá.
 */
function parsePriceToNumber(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (raw == null || raw === "") return 0;
  const n = Number.parseFloat(String(raw).trim().replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/** Devuelve string vacío sólo cuando no hay valor; en otro caso, Number puro */
function parseOptionalNumber(raw: unknown): number | "" {
  if (raw == null || raw === "") return "";
  const n = parsePriceToNumber(raw);
  return n;
}

function normalizeM2PerBoxForForm(raw: unknown): number | "" {
  return parseOptionalNumber(raw);
}

/** Coincide con los <option value> del select; tolera camelCase y variantes en Firebase */
function normalizePriceTypeForForm(raw: unknown): string {
  if (raw == null || raw === "") return "";
  const s = String(raw).trim();
  const lower = s.toLowerCase().replace(/\s+/g, " ");
  if (lower === "por unidad" || lower === "unidad") return "por unidad";
  if (
    lower === "por m2" ||
    lower === "por m²" ||
    (lower.includes("por") && (lower.includes("m2") || lower.includes("m²")))
  ) {
    return "por m²";
  }
  return s === "por unidad" || s === "por m²" ? s : "";
}

function buildFormState(product?: any) {
  if (!product) return { ...EMPTY_FORM };
  const rawType = product.PriceType ?? product.priceType;
  const rawM2 = product.M2PerBox ?? product.m2PerBox;
  return {
    ...EMPTY_FORM,
    ...product,
    Price: parsePriceToNumber(product.Price ?? product.price),
    PriceType: normalizePriceTypeForForm(rawType),
    M2PerBox: normalizeM2PerBoxForForm(rawM2),
    UnitsPerBox: parseOptionalNumber(product.UnitsPerBox ?? product.unitsPerBox),
  };
}

const ProductForm = ({
  product,
  onSave,
  onCancel,
  title,
  submitLabel = "Guardar producto",
}: ProductFormProps) => {
  const [categories, setCategories] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState(() => buildFormState(product));

  useEffect(() => {
    const categoriesRef = dbRef(database, "Category");
    const unsubscribe = onValue(
      categoriesRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data && typeof data === "object") {
          const categoryList = Object.keys(data)
            .map((key) => ({
              IdCategory: key,
              ...data[key],
            }))
            .sort((a, b) => (a.Name || "").localeCompare(b.Name || "", "es", { sensitivity: "base" }));
          setCategories(categoryList);
        } else {
          setCategories([]);
        }
      },
      (error) => {
        console.error("Error al cargar categorías:", error);
        setCategories([]);
      }
    );

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  const assignableCategories = useMemo(() => {
    const parentCategoryIds = new Set(
      categories
        .map((category) => category.ParentCategoryId)
        .filter(Boolean)
    );

    return categories.filter((category) => !parentCategoryIds.has(category.IdCategory));
  }, [categories]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    if (NUMERIC_FIELDS.has(name)) {
      setFormData((prev: any) => ({
        ...prev,
        [name]:
          name === "Price" ? parsePriceToNumber(value) : parseOptionalNumber(value),
      }));
      return;
    }
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: any) => {
    const files: any[] = Array.from(e.target.files).filter((file: any) =>
      file.type.startsWith("image/")
    );
    const uploadedUrls: string[] = [];

    for (const file of files) {
      const uniqueFileName = `${Date.now()}-${product?.Name || "producto"}`;
      const storageReference = storageRef(storage, `products/${uniqueFileName}`);
      await uploadBytes(storageReference, file);
      const downloadUrl = await getDownloadURL(storageReference);
      uploadedUrls.push(downloadUrl);
    }

    setFormData((prev: any) => ({
      ...prev,
      ImageUrls: [...(prev.ImageUrls || []), ...uploadedUrls],
    }));

    return uploadedUrls;
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const fileInput: any = document.getElementById("images");

    setIsUploading(true);

    let finalData = { ...formData };

    if (fileInput && fileInput.files.length > 0) {
      const uploadedUrls = await handleImageUpload({ target: fileInput });
      finalData = {
        ...finalData,
        ImageUrls: [...(finalData.ImageUrls || []), ...uploadedUrls],
      };
    }

    // Limpiar campo que no corresponde al tipo de precio
    if (finalData.PriceType === "por unidad") {
      finalData.M2PerBox = "";
    } else if (finalData.PriceType === "por m²") {
      finalData.UnitsPerBox = "";
    }

    const normalizedPrice = parsePriceToNumber(finalData.Price);
    const normalizedM2 = parseOptionalNumber(finalData.M2PerBox);

    if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
      setIsUploading(false);
      alert("El precio debe ser un número mayor a 0.");
      return;
    }

    if (
      finalData.PriceType === "por m²" &&
      (normalizedM2 === "" || !Number.isFinite(normalizedM2 as number) || (normalizedM2 as number) <= 0)
    ) {
      setIsUploading(false);
      alert("Indicá un valor válido de m² por caja para productos vendidos por m².");
      return;
    }

    const normalizedUnits = parseOptionalNumber(finalData.UnitsPerBox);

    const payload = {
      ...finalData,
      Price: normalizedPrice,
      M2PerBox: normalizedM2 === "" ? null : (normalizedM2 as number),
      UnitsPerBox: normalizedUnits === "" ? null : (normalizedUnits as number),
    };

    await onSave(payload);
    setIsUploading(false);

    if (fileInput) fileInput.value = "";
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
        <h3 className="text-lg font-medium mb-4">
          {title || (product ? "Editar producto" : "Agregar nuevo producto")}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="IdCategory">Categoría</Label>
            {assignableCategories.length > 0 ? (
              <select
                id="IdCategory"
                name="IdCategory"
                value={formData.IdCategory}
                onChange={handleChange}
                className="w-full border rounded-md px-3 py-2"
                required
              >
                <option value="">Selecciona una categoría</option>
                {assignableCategories.map((category) => (
                  <option key={category.IdCategory} value={category.IdCategory}>
                    {category.Name}
                  </option>
                ))}
              </select>
            ) : (
              <p>No hay categorías disponibles.</p>
            )}
          </div>
          <div>
            <Label htmlFor="Name">Nombre</Label>
            <Input
              id="Name"
              name="Name"
              type="text"
              placeholder="Nombre del producto"
              value={formData.Name}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <Label htmlFor="Description">Descripción</Label>
            <Input
              id="Description"
              name="Description"
              type="text"
              placeholder="Descripción del producto"
              value={formData.Description}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="Price">Precio</Label>
            <Input
              id="Price"
              name="Price"
              type="number"
              placeholder="Precio del producto"
              value={formData.Price}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <Label htmlFor="Size">Tamaño</Label>
            <Input
              id="Size"
              name="Size"
              type="text"
              placeholder="Tamaño del producto"
              value={formData.Size}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="PriceType">Tipo de precio</Label>
            <select
              id="PriceType"
              name="PriceType"
              value={formData.PriceType}
              onChange={handleChange}
              className="w-full border rounded-md px-3 py-2"
              required
            >
              <option value="">Selecciona un tipo de precio</option>
              <option value="por unidad">Precio por unidad</option>
              <option value="por m²">Precio por metro cuadrado (m²)</option>
            </select>
          </div>
          {formData.PriceType === "por m²" && (
            <div>
              <Label htmlFor="M2PerBox">m² por caja *</Label>
              <Input
                id="M2PerBox"
                name="M2PerBox"
                type="number"
                step="0.01"
                min="0"
                placeholder="Ej: 2.19"
                value={formData.M2PerBox || ""}
                onChange={handleChange}
                required
              />
              {formData.M2PerBox > 0 && formData.Price > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  Precio por caja:{" "}
                  <span className="font-semibold text-foreground">
                    ${(formData.Price * formData.M2PerBox).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </p>
              )}
            </div>
          )}

          {formData.PriceType === "por unidad" && (
            <div>
              <Label htmlFor="UnitsPerBox">Unidades por caja (opcional)</Label>
              <Input
                id="UnitsPerBox"
                name="UnitsPerBox"
                type="number"
                min="1"
                step="1"
                placeholder="Ej: 6"
                value={formData.UnitsPerBox || ""}
                onChange={handleChange}
              />
              {formData.UnitsPerBox > 0 && formData.Price > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  Precio por caja:{" "}
                  <span className="font-semibold text-foreground">
                    ${(formData.Price * formData.UnitsPerBox).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </p>
              )}
            </div>
          )}
          <div>
            <Label htmlFor="images">Imágenes</Label>
            <Input
              id="images"
              type="file"
              multiple
              accept="image/*"
              onChange={(e: any) => {
                if (e.target.files.length > 0) {
                  handleImageUpload(e);
                }
              }}
              className="w-full"
            />
          </div>
          <div className="pt-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-amber-200 bg-amber-50">
              <div>
                <p className="font-medium text-sm">Requiere consulta previa</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  El cliente no podrá comprarlo por la tienda. Se mostrará un botón de WhatsApp para coordinar la entrega.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.RequiresQuote || false}
                onChange={(e) =>
                  setFormData((prev: any) => ({ ...prev, RequiresQuote: e.target.checked }))
                }
                className="w-5 h-5 cursor-pointer shrink-0"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isUploading}>
              {isUploading ? "Guardando..." : submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default ProductForm;
