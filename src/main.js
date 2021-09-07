/*
 * Copyright © 2020. TIBCO Software Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

//@ts-check - Get type warnings from the TypeScript language server. Remove if not wanted.

/**
 * Get access to the Spotfire Mod API by providing a callback to the initialize method.
 * @param {Spotfire.Mod} mod - mod api
 */
Spotfire.initialize(async (mod) => {
    /**
     * Create the read function.
     */
    const reader = mod.createReader(
        mod.visualization.data(),
        mod.windowSize()
    );

    /**
     * Store the context.
     */
    const context = mod.getRenderContext();

    // ------------------------------------------------------------------
    // SPOTFIRE DEFINITIONS
    let rows = null;
    let data = [];

    /**
     * Initiate the read loop
     */
    reader.subscribe(render);

    /**
     * @param {Spotfire.DataView} dataView
     * param {Spotfire.Size} windowSize
     * param {Spotfire.ModProperty<string>} prop
     */
    async function render(dataView) {
        /**
         * Check the data view for errors
         */
        let errors = await dataView.getErrors();
        if (errors.length > 0) {
            // Showing an error overlay will hide the mod iframe.
            // Clear the mod content here to avoid flickering effect of
            // an old configuration when next valid data view is received.
            mod.controls.errorOverlay.show(errors);
            return;
        }
        mod.controls.errorOverlay.hide();

        rows = await dataView.allRows();

        //------------------------------------------------------------------   

        // ViZ FUNCTIONS
        // Converts data rows into objects
        let processRows = function () {
            if (rows == null) return;

            // Reset arrays
            data = [];

            // Iterate over rows and push into arrays
            rows.forEach(function (row) {
                let stop = {
                    category: row.categorical("column1").formattedValue(),
                    pivotcolumn: row.categorical("pivotColumn").formattedValue(),
                    formatColumn: row.categorical("formatColumn").formattedValue(),
                    value: row.continuous("value").value()
                }

                data.push(stop);
            });
        }

        // Process rows to objects
        processRows();
        //------------------------------------------------------------------

        //Metodo para pivotear archivos JSON
        function getPivotArray(dataArray, rowIndex, colIndex, dataIndex, titlePivot) {

            var result = {}, ret = [];
            var newCols = [];
            for (var i = 0; i < dataArray.length; i++) {

                if (!result[dataArray[i][rowIndex]]) {
                    result[dataArray[i][rowIndex]] = {};
                }
                result[dataArray[i][rowIndex]][dataArray[i][colIndex]] = dataArray[i][dataIndex];

                //To get column names
                if (newCols.indexOf(dataArray[i][colIndex]) == -1) {
                    newCols.push(dataArray[i][colIndex]);
                }
            }

            newCols.sort();
            var item = [];

            //Add Header Row
            item.push(titlePivot);
            item.push.apply(item, newCols);
            ret.push(item);

            //Add content 
            for (var key in result) {
                item = [];
                item.push(key);

                for (var i = 0; i < newCols.length; i++) {
                    item.push(result[key][newCols[i]] || "-");
                }
                ret.push(item);
            }
            return ret;
        }

        //Metodo para constuir contenido HTML
        function buildPivotTable(tableContainer, Data) {
            const pivotTable = document.querySelector(tableContainer);
            pivotTable.innerHTML = ''

            var newThead = document.createElement("thead");
            var newTbody = document.createElement("tbody");

            // --- Encontramos los valores de las categoría para futura combinación de filas
            var categories = []
            var auxCounter1 = 0

            Data.forEach(
                n => {
                    if (auxCounter1 > 0) {
                        categories.includes(n[0]) ? null : categories.push(n[0])
                    }
                    auxCounter1++;
                }
            )

            // --- Completamos el resto de la tabla
            let counterContent = 0;
            var uniqueCategory = []
            let numberColumnsCategory;

            Data.forEach(pD => {
                counterContent++;
                if (counterContent > 1) {
                    let newBodyTr = document.createElement("tr");

                    for (var i = 0; i < pD.length; i++) {
                        let separados = pD[0].split('»')
                        let category = separados[0]
                        let subCategory = separados[1]
                        numberColumnsCategory = separados.length - 1
                        let formatCharacter = separados[numberColumnsCategory].split('-').map(Function.prototype.call, String.prototype.trim)

                        if (i === 0) {

                            if (!uniqueCategory.includes(category)) {
                                uniqueCategory.push(category)

                                let newTd = document.createElement("td");
                                newTd.setAttribute('rowSpan', `${categories.filter(
                                    cat => {
                                        let auxCat = cat.split('»')
                                        return category === auxCat[0]
                                    }
                                ).length}`);

                                newTd.setAttribute('class', 'category')
                                newTd.append(document.createTextNode(category));
                                newBodyTr.appendChild(newTd);
                            }
                            if (separados.length > 2) {
                                let newTd2 = document.createElement("td");
                                newTd2.setAttribute('class', 'subcategory')
                                newTd2.append(document.createTextNode(subCategory));
                                newBodyTr.appendChild(newTd2);
                            }
                        }
                        else {
                            const options = { style: formatCharacter[0], currency: 'USD', minimumFractionDigits: formatCharacter[1], maximumFractionDigits: formatCharacter[1] };
                            const numberFormat = new Intl.NumberFormat('en-EN', options);
                            const formatValue = numberFormat.format(pD[i])
                            const value = formatValue.includes("NaN") ? "-" : formatValue

                            let newTd = document.createElement("td");
                            if (featuredColumns.includes(Data[0][i])) {
                                newTd.setAttribute('class', 'value featured')
                            }
                            else {
                                newTd.setAttribute('class', 'value')
                            }
                            newTd.append(document.createTextNode(
                                value
                            ))
                            newBodyTr.appendChild(newTd)
                        }

                    }
                    newTbody.appendChild(newBodyTr);
                }
            }
            );

            // --- Construímos el cabecero de la tabla
            var counterHeader = 0;
            Data.every(
                pD => {
                    counterHeader++;
                    if (counterHeader === 1) {
                        let newTr = document.createElement("tr");
                        for (var i = 0; i < pD.length; i++) {
                            if (i === 0) {
                                for (var auxI = 0; auxI < numberColumnsCategory; auxI++) {
                                    let newTh = document.createElement("th");
                                    newTh.append(document.createTextNode(
                                        auxI === 0 ? "Category" : `Subcategory`
                                    ))
                                    newTh.setAttribute('class',
                                        auxI === 0 ? "category" : `ubcategory`
                                    )
                                    newTr.appendChild(newTh)
                                }
                            }
                            else {
                                let newTh = document.createElement("th");
                                newTh.append(document.createTextNode(pD[i]))
                                newTh.setAttribute('class', 'value')
                                newTr.appendChild(newTh)
                            }
                        }

                        newThead.appendChild(newTr);
                        pivotTable.appendChild(newThead);
                        return true;
                    }
                    else {
                        return false;
                    }

                }
            )

            pivotTable.appendChild(newTbody);
        }

        const featuredColumns = ['Forecast']
        const CustomSortValues = ['Ending Balance']

        // generic comparison function
        const cmp = function (x, y) {
            return x > y ? 1 : x < y ? -1 : 0;
        };

        // --- Order data json
        data.sort(function (a, b) {
            let separadosA = a.category.split('»')
            let categoryA = separadosA[0].trim()
            let subcategoryA = separadosA[separadosA.length - 1].trim()

            let separadosB = b.category.split('»')
            let categoryB = separadosB[0].trim()
            let subcategoryB = separadosB[separadosB.length - 1].trim()

            let valueA, valueB;

            valueA = CustomSortValues.includes(subcategoryA)? CustomSortValues.indexOf(subcategoryA) + subcategoryA: subcategoryA
            valueB = CustomSortValues.includes(subcategoryB)? CustomSortValues.indexOf(subcategoryB) + subcategoryB: subcategoryB

            return cmp(
                [cmp(categoryA, categoryB), cmp(valueA, valueB)],
                [cmp(categoryB, categoryA), cmp(valueB, valueA)]
            );
        });

        // --- Se construye una llave unica para segmentar la infomación
        const customdata = []
        data.forEach(
            data => {
                customdata.push({ "customKey": `${data.category} » ${data.formatColumn}`, "pivotcolumn": data.pivotcolumn, "value": data.value })
            }
        )

        // --- Pivoteamos los datos basado en la "pivot column"
        let pivotData = getPivotArray(customdata, "customKey", "pivotcolumn", "value", "");

        // --- Se construye tabla
        buildPivotTable("#pivotTableContainer", pivotData);

        /**
         * Signal that the mod is ready for export.
         */
        context.signalRenderComplete();
    }
});
