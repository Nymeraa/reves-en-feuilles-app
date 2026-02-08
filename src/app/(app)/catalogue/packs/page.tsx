import { PackService } from '@/services/pack-service';
import { RecipeService } from '@/services/recipe-service';
import { InventoryService } from '@/services/inventory-service';
import { PacksTableWrapper } from '@/components/packs/pack-table-wrapper';
import { PackDialog } from '@/components/packs/pack-dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default async function PacksPage() {
  const packs = await PackService.getPacks('org-1');
  const recipes = await RecipeService.getRecipes('org-1');
  const ingredients = await InventoryService.getIngredients('org-1');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Packs & Coffrets</h2>
          <p className="text-muted-foreground">{(packs || []).length} packs en catalogue</p>
        </div>
        <PackDialog
          recipes={recipes}
          ingredients={ingredients}
          trigger={
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">
              <Plus className="mr-2 h-4 w-4" /> Nouveau pack
            </Button>
          }
        />
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        <PacksTableWrapper
          data={packs || []}
          recipes={recipes || []}
          ingredients={ingredients || []}
        />
      </div>
    </div>
  );
}
