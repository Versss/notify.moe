package embed

import (
	"net/http"

	"github.com/aerogo/aero"
	"github.com/animenotifier/notify.moe/components"
	"github.com/animenotifier/notify.moe/utils"
)

// Get anime list in the browser extension.
func Get(ctx aero.Context) error {
	user := utils.GetUser(ctx)

	if user == nil {
		return ctx.HTML(components.Login("_blank"))
	}

	if !user.HasBasicInfo() {
		return ctx.HTML(components.ExtensionEnterBasicInfo())
	}

	animeList := user.AnimeList()

	if animeList == nil {
		return ctx.Error(http.StatusNotFound, "Anime list not found")
	}

	watchingList := animeList.Watching()
	watchingList.Sort(user.Settings().SortBy)

	return ctx.HTML(components.BrowserExtension(watchingList, animeList.User(), user))
}
